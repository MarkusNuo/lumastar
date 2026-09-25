package app.lingora.api.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.SpaClient;
import app.lingora.content.ContentFixture;
import app.lingora.content.ContentLoader;
import app.lingora.content.ContentSeeder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Lesson flow against the content fixture: curriculum, start, attempts and completion with XP. */
class LessonApiTest extends IntegrationTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String GREETINGS = "a1_u01_greetings";
    private static final String FAMILY = "a1_u02_family";
    private static final int FAST_MS = 2_000;
    private static final int SLOW_MS = 20_000;
    private static final Map<String, String> CORRECT_GREETINGS_ANSWERS = Map.of(
            "ex_a1_u01_001", """
                    {"choice": "Mirëdita"}""",
            "ex_a1_u01_002", """
                    {"text": "si je"}""",
            "ex_a1_u01_003", """
                    {"tokens": ["Guten", "Tag", "wie", "geht", "es", "dir"]}""",
            "ex_a1_u01_004", """
                    {"mistakes": 0}""",
            "ex_a1_u01_005", """
                    {"tokens": ["Mirëdita", "si", "je"]}""");

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;

    @BeforeEach
    void signedInLearnerWithSeededFixture() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(loader.load(ContentFixture.path()));
        learner = new SpaClient(mvc);
        learner.get("/api/auth/status");
        assertThat(learner.post("/api/auth/setup", """
                {"displayName": "Erza", "password": "shpija-e-madhe"}""")).hasStatus(HttpStatus.CREATED);
    }

    @Nested
    class Curriculum {

        @Test
        void listsStagesWithTheirUnitsInPathOrder() {
            MvcTestResult curriculum = learner.get("/api/curriculum");

            assertThat(curriculum).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                    {"stages": [
                      {"level": "A1.1", "title": "Erste Gespräche", "units": [
                        {"id": "a1_u01_greetings", "title": "Begrüssung & Höflichkeit",
                         "description": "Grüssen, sich verabschieden, bitte und danke sagen.", "color": "violet",
                         "icon": "hand-waving", "skillTags": ["vocab.greetings", "phrase.politeness"], "estimatedLessons": 4,
                         "hasContent": true},
                        {"id": "a1_u02_family", "title": "Familie",
                         "description": "Familienmitglieder benennen und sagen, wer zu Hause ist.", "color": "teal",
                         "icon": "users", "skillTags": ["vocab.family", "grammar.definite_article.fem"], "estimatedLessons": 5,
                         "hasContent": true}]},
                      {"level": "A1.2", "title": "Alltag", "units": [
                        {"id": "a1_u03_numbers", "title": "Zahlen 1–100", "skillTags": ["vocab.numbers"], "hasContent": false}]}]}""");
        }

        @Test
        void requiresASignedInLearner() {
            assertProblem(new SpaClient(mvc).get("/api/curriculum"), HttpStatus.UNAUTHORIZED, "authentication_required");
        }
    }

    @Nested
    class Start {

        @Test
        void composesALessonOfAllExercisesWithTheirSolutions() {
            MvcTestResult started = learner.post("/api/lessons", """
                    {"unitId": "a1_u02_family"}""");

            assertThat(started).hasStatus(HttpStatus.CREATED);
            JsonNode lesson = body(started);
            assertThat(lesson.get("unitId").asString()).isEqualTo(FAMILY);
            assertThat(exerciseIds(lesson)).containsExactlyInAnyOrder("ex_a1_u02_001", "ex_a1_u02_002", "ex_a1_u02_003");
            assertThat(exercise(lesson, "ex_a1_u02_001")).isEqualTo(JSON.readTree("""
                    {"id": "ex_a1_u02_001", "type": "fill_gap", "level": "A1.1", "difficulty": 1,
                     "prompt": {"lang": "de", "text": "Die Mutter ist zu Hause."}, "answerLang": "sq",
                     "choices": ["âsht", "jam", "je"], "text": "Nâna ___ në shpi.", "solutions": ["âsht"],
                     "standardForms": ["është"], "explanation": "„Ist“ heisst auf Gheg „âsht“.",
                     "skillTags": ["grammar.verb_be", "vocab.family"], "itemIds": ["item_nane", "item_asht", "item_shpi"],
                     "reviewed": false}"""));
            assertThat(jdbc.sql("""
                            SELECT kind || '|' || unit_id || '|' || level || '|' || composed_by || '|' || cardinality(exercise_ids)
                            FROM sessions WHERE id = :id""")
                    .param("id", UUID.fromString(lesson.get("sessionId").asString())).query(String.class).single())
                    .isEqualTo("lesson|a1_u02_family|A1.1|rule_based_v1|3");
        }

        @Test
        void ordersTheExercisesByRisingDifficulty() {
            JsonNode lesson = body(learner.post("/api/lessons", """
                    {"unitId": "a1_u01_greetings"}"""));

            assertThat(StreamSupport.stream(lesson.get("exercises").spliterator(), false)
                    .map(exercise -> exercise.get("difficulty").asInt()).toList()).isSorted().hasSize(5);
        }

        @Test
        void describesMatchPairsAndWordOrderForTheApp() {
            JsonNode lesson = body(learner.post("/api/lessons", """
                    {"unitId": "a1_u01_greetings"}"""));

            assertThat(exercise(lesson, "ex_a1_u01_004").get("pairs")).hasSize(5);
            assertThat(exercise(lesson, "ex_a1_u01_004").has("solutions")).isFalse();
            assertThat(exercise(lesson, "ex_a1_u01_005").get("tokens").toString()).isEqualTo("[\"Mirëdita\",\"si\",\"je\"]");
        }

        @Test
        void rejectsUnknownUnitsAndUnitsWithoutExercises() {
            assertProblem(learner.post("/api/lessons", """
                    {"unitId": "a9_unknown"}"""), HttpStatus.NOT_FOUND, "unit_not_found");
            assertProblem(learner.post("/api/lessons", """
                    {"unitId": "a1_u03_numbers"}"""), HttpStatus.CONFLICT, "unit_without_content");
        }

        @Test
        void validatesTheRequest() {
            MvcTestResult blank = learner.post("/api/lessons", """
                    {"unitId": " "}""");

            assertProblem(blank, HttpStatus.BAD_REQUEST, "validation_failed");
            assertThat(blank).bodyJson().extractingPath("$.errors[*].field").asArray().containsExactly("unitId");
        }

        @Test
        void requiresSignInAndCsrfToken() {
            SpaClient stranger = new SpaClient(mvc);
            stranger.get("/api/auth/status");

            assertProblem(stranger.post("/api/lessons", """
                    {"unitId": "a1_u01_greetings"}"""), HttpStatus.UNAUTHORIZED, "authentication_required");
            assertProblem(learner.postWithoutCsrfHeader("/api/lessons", """
                    {"unitId": "a1_u01_greetings"}"""), HttpStatus.FORBIDDEN, "csrf_invalid");
        }
    }

    @Nested
    class Attempts {

        @Test
        void evaluatesACorrectAnswer() {
            String lesson = start(GREETINGS);

            MvcTestResult attempt = answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, false);

            assertThat(attempt).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                    {"exerciseId": "ex_a1_u01_002", "outcome": "correct", "countsAsCorrect": true,
                     "explanation": "„Si je?“ ist die vertraute Frage nach dem Befinden.", "solution": "Si je?",
                     "rating": "good"}""");
        }

        @Test
        void acceptsAStandardFormWithAHint() {
            String lesson = start(FAMILY);

            MvcTestResult attempt = answer(lesson, "ex_a1_u02_002", """
                    {"text": "Shtëpia është e madhe."}""", FAST_MS, false);

            assertThat(attempt).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                    {"exerciseId": "ex_a1_u02_002", "outcome": "correct_standard_form", "countsAsCorrect": true,
                     "errorCategory": "variant.standard_form",
                     "hint": "Richtig! Auf Gheg sagt man eher „shpija“ statt „shtëpia“ und „âsht“ statt „është“.",
                     "explanation": "Der bestimmte Artikel wird angehängt: shpi → shpija. „Ist“ heisst auf Gheg „âsht“.",
                     "solution": "Shpija âsht e madhe.", "rating": "good"}""");
        }

        @Test
        void recordsEveryAnswerWithItsEvaluation() {
            String lesson = start(FAMILY);

            MvcTestResult wrong = answer(lesson, "ex_a1_u02_002", """
                    {"text": "Shpi âsht e madhe."}""", 6_400, false);
            answer(lesson, "ex_a1_u02_002", """
                    {"text": "Shpija asht e madhe"}""", 3_100, true);

            assertThat(wrong).bodyJson().extractingPath("$.errorCategory").isEqualTo("grammar.definite_article");
            assertThat(wrong).bodyJson().extractingPath("$.hint").isEqualTo("Das Haus = shpija (Artikel als Endung).");
            assertThat(wrong).bodyJson().extractingPath("$.rating").isEqualTo("again");
            assertThat(jdbc.sql("""
                            SELECT position || '|' || exercise_id || '|' || exercise_type || '|' || array_to_string(skill_tags, ',')
                                   || '|' || is_retry || '|' || (answer ->> 'text') || '|' || outcome || '|' || is_correct
                                   || '|' || error_category || '|' || fsrs_rating || '|' || response_ms || '|' || evaluated_by
                            FROM attempts WHERE session_id = :lesson ORDER BY position""")
                    .param("lesson", UUID.fromString(lesson)).query(String.class).list())
                    .containsExactly(
                            "1|ex_a1_u02_002|translate_free|grammar.definite_article.fem,vocab.home|false|Shpi âsht e madhe."
                                    + "|wrong|false|grammar.definite_article|again|6400|rule_based_v1",
                            "2|ex_a1_u02_002|translate_free|grammar.definite_article.fem,vocab.home|true|Shpija asht e madhe"
                                    + "|almost_correct|true|spelling.nasal_vowel|hard|3100|rule_based_v1");
        }

        @Test
        void rejectsAnExerciseOutsideTheLessonAndAnAnswerOfTheWrongKind() {
            String lesson = start(GREETINGS);

            assertProblem(answer(lesson, "ex_a1_u02_001", """
                    {"choice": "âsht"}""", FAST_MS, false), HttpStatus.UNPROCESSABLE_CONTENT, "exercise_not_in_lesson");
            assertProblem(answer(lesson, "ex_a1_u01_001", """
                    {"text": "Mirëdita"}""", FAST_MS, false), HttpStatus.UNPROCESSABLE_CONTENT, "answer_type_mismatch");
            assertThat(jdbc.sql("SELECT count(*) FROM attempts").query(Integer.class).single()).isZero();
        }

        @Test
        void acceptsOneFirstAnswerPerExerciseAndRetriesOnlyAfterIt() {
            String lesson = start(GREETINGS);

            assertProblem(answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, true), HttpStatus.CONFLICT, "retry_before_first_attempt");
            assertThat(answer(lesson, "ex_a1_u01_002", """
                    {"text": "si jeni"}""", FAST_MS, false)).hasStatusOk();
            assertProblem(answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, false), HttpStatus.CONFLICT, "exercise_already_answered");
            assertThat(answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, true)).hasStatusOk();
        }

        @Test
        void acceptsRetriesUntilTheExerciseIsAnsweredCorrectly() {
            String lesson = start(GREETINGS);
            answer(lesson, "ex_a1_u01_002", """
                    {"text": "si jeni"}""", FAST_MS, false);

            assertThat(answer(lesson, "ex_a1_u01_002", """
                    {"text": "si jeni"}""", FAST_MS, true)).hasStatusOk();
            assertThat(answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, true)).hasStatusOk();
            assertProblem(answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, true), HttpStatus.CONFLICT, "exercise_already_correct");
        }

        @Test
        void rejectsARetryOfAnExerciseAnsweredCorrectlyAtTheFirstAttempt() {
            String lesson = start(GREETINGS);
            answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, false);

            assertProblem(answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, true), HttpStatus.CONFLICT, "exercise_already_correct");
        }

        @Test
        void validatesTheAnswer() {
            String lesson = start(GREETINGS);

            MvcTestResult twoKinds = answer(lesson, "ex_a1_u01_001", """
                    {"choice": "Mirëdita", "text": "Mirëdita"}""", FAST_MS, false);
            MvcTestResult noKind = answer(lesson, "ex_a1_u01_001", "{}", FAST_MS, false);

            assertProblem(twoKinds, HttpStatus.BAD_REQUEST, "validation_failed");
            assertThat(twoKinds).bodyJson().extractingPath("$.errors[*].field").asArray().containsExactly("answer.singleAnswer");
            assertProblem(noKind, HttpStatus.BAD_REQUEST, "validation_failed");
            assertProblem(answer(lesson, "ex_a1_u01_001", """
                    {"choice": "Mirëdita"}""", -1, false), HttpStatus.BAD_REQUEST, "validation_failed");
            assertProblem(learner.post("/api/lessons/%s/attempts".formatted(lesson), """
                    {"exerciseId": "ex_a1_u01_001", "responseTimeMs": 100}"""), HttpStatus.BAD_REQUEST, "validation_failed");
            assertProblem(learner.post("/api/lessons/not-a-uuid/attempts", """
                    {"exerciseId": "ex_a1_u01_001", "answer": {"choice": "Mirëdita"}, "responseTimeMs": 100}"""),
                    HttpStatus.BAD_REQUEST, "bad_request");
        }

        @Test
        void rejectsUnknownLessonsAndLessonsOfOtherLearners() {
            UUID otherLearnersLesson = lessonOfAnotherLearner();

            assertProblem(answer(UUID.randomUUID().toString(), "ex_a1_u01_001", """
                    {"choice": "Mirëdita"}""", FAST_MS, false), HttpStatus.NOT_FOUND, "lesson_not_found");
            assertProblem(answer(otherLearnersLesson.toString(), "ex_a1_u01_001", """
                    {"choice": "Mirëdita"}""", FAST_MS, false), HttpStatus.NOT_FOUND, "lesson_not_found");
            assertProblem(learner.post("/api/lessons/%s/complete".formatted(otherLearnersLesson), ""),
                    HttpStatus.NOT_FOUND, "lesson_not_found");
        }

        @Test
        void rejectsAnswersToACompletedLesson() {
            String lesson = start(GREETINGS);
            answerAllCorrectly(lesson, FAST_MS);
            learner.post("/api/lessons/%s/complete".formatted(lesson), "");

            assertProblem(answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, true), HttpStatus.CONFLICT, "lesson_completed");
        }
    }

    @Nested
    class Mastery {

        @Test
        void updatesTheMasteryOfEverySkillTagOfTheAnsweredExercise() {
            String lesson = start(FAMILY);

            answer(lesson, "ex_a1_u02_003", """
                    {"choice": "die Mutter"}""", FAST_MS, false);

            assertThat(mastery()).containsExactly(
                    "grammar.definite_article.fem|0.5|1|1|true",
                    "vocab.family|0.5|1|1|true");
        }

        @Test
        void countsRetriesWithLessWeightAndNotAsAttempts() {
            String lesson = start(FAMILY);

            answer(lesson, "ex_a1_u02_002", """
                    {"text": "Shpi âsht e madhe."}""", FAST_MS, false);
            answer(lesson, "ex_a1_u02_002", """
                    {"text": "Shpija âsht e madhe."}""", FAST_MS, true);

            // wrong first answer: 0 → 0; retry: 0.3 · max(0.15, 1/3) · 1 = 0.1
            assertThat(mastery()).containsExactly(
                    "grammar.definite_article.fem|0.1|1|0|true",
                    "vocab.home|0.1|1|0|true");
        }

        @Test
        void storesTheSolutionShownWithTheFeedback() {
            String lesson = start(FAMILY);

            answer(lesson, "ex_a1_u02_002", """
                    {"text": "Shpi âsht e madhe."}""", FAST_MS, false);

            assertThat(jdbc.sql("SELECT expected FROM attempts").query(String.class).single()).isEqualTo("Shpija âsht e madhe.");
        }

        private List<String> mastery() {
            return jdbc.sql("""
                            SELECT m.skill_tag || '|' || round(m.mastery::numeric, 4)::float8 || '|' || m.attempts || '|'
                                   || m.correct || '|' || (m.last_practiced_at = a.answered_at)
                            FROM skill_mastery m
                            JOIN LATERAL (SELECT max(answered_at) AS answered_at FROM attempts) a ON true
                            ORDER BY m.skill_tag""")
                    .query(String.class).list();
        }
    }

    @Nested
    class Completion {

        @Test
        void awardsTwentyXpForAPerfectAndFastLesson() {
            String lesson = start(GREETINGS);
            answerAllCorrectly(lesson, FAST_MS);

            MvcTestResult result = learner.post("/api/lessons/%s/complete".formatted(lesson), "");

            assertThat(result).hasStatusOk();
            JsonNode body = body(result);
            assertThat(body.get("xpEarned").asInt()).isEqualTo(20);
            assertThat(body.get("xpBreakdown")).isEqualTo(JSON.readTree("""
                    {"base": 10, "perfectBonus": 5, "speedBonus": 5}"""));
            assertThat(body.get("accuracy").asDouble()).isEqualTo(1.0);
            assertThat(body.get("correctCount").asInt()).isEqualTo(5);
            assertThat(body.get("exerciseCount").asInt()).isEqualTo(5);
            assertThat(body.get("durationMs").asLong()).isNotNegative();
            assertThat(body.get("xpTotal").asInt()).isEqualTo(20);
            assertThat(StreamSupport.stream(body.get("learnedItems").spliterator(), false).map(item -> item.get("id").asString()))
                    .containsExactlyInAnyOrder("item_miredita", "item_si_je", "item_mirupafshim", "item_faleminderit",
                            "item_po", "item_jo");
            assertThat(StreamSupport.stream(body.get("learnedItems").spliterator(), false)
                    .filter(item -> item.get("id").asString().equals("item_miredita")).findFirst().orElseThrow())
                    .isEqualTo(JSON.readTree("""
                            {"id": "item_miredita", "gheg": "mirëdita", "de": "guten Tag"}"""));
            assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.xpTotal").isEqualTo(20);
        }

        @Test
        void countsOnlyFirstAttemptsForAccuracyAndBonuses() {
            String lesson = start(GREETINGS);
            answerAllCorrectly(lesson, SLOW_MS, "ex_a1_u01_002");
            answer(lesson, "ex_a1_u01_002", """
                    {"text": "si jeni"}""", SLOW_MS, false);
            answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, true);

            JsonNode body = body(learner.post("/api/lessons/%s/complete".formatted(lesson), ""));

            assertThat(body.get("xpEarned").asInt()).isEqualTo(10);
            assertThat(body.get("xpBreakdown")).isEqualTo(JSON.readTree("""
                    {"base": 10, "perfectBonus": 0, "speedBonus": 0}"""));
            assertThat(body.get("accuracy").asDouble()).isEqualTo(0.8);
            assertThat(body.get("correctCount").asInt()).isEqualTo(4);
            assertThat(jdbc.sql("SELECT accuracy::text || '|' || xp_earned FROM sessions").query(String.class).single())
                    .isEqualTo("0.800|10");
        }

        @Test
        void completingAgainReturnsTheSameResultWithoutAwardingXpTwice() {
            String lesson = start(GREETINGS);
            answerAllCorrectly(lesson, FAST_MS);
            String first = body(learner.post("/api/lessons/%s/complete".formatted(lesson), "")).toString();

            MvcTestResult again = learner.post("/api/lessons/%s/complete".formatted(lesson), "");

            assertThat(again).hasStatusOk().bodyJson().isStrictlyEqualTo(first);
            assertThat(jdbc.sql("SELECT xp_total FROM users").query(Integer.class).single()).isEqualTo(20);
        }

        @Test
        void addsTheXpOfEveryLessonToTheTotal() {
            String firstLesson = start(GREETINGS);
            answerAllCorrectly(firstLesson, FAST_MS);
            learner.post("/api/lessons/%s/complete".formatted(firstLesson), "");
            String secondLesson = start(GREETINGS);
            answerAllCorrectly(secondLesson, SLOW_MS);

            MvcTestResult second = learner.post("/api/lessons/%s/complete".formatted(secondLesson), "");

            assertThat(second).bodyJson().extractingPath("$.xpEarned").isEqualTo(15);
            assertThat(second).bodyJson().extractingPath("$.xpTotal").isEqualTo(35);
        }

        @Test
        void rejectsALessonWithUnansweredExercises() {
            String lesson = start(GREETINGS);
            answer(lesson, "ex_a1_u01_002", """
                    {"text": "si je"}""", FAST_MS, false);

            assertProblem(learner.post("/api/lessons/%s/complete".formatted(lesson), ""), HttpStatus.CONFLICT, "lesson_incomplete");
            assertThat(jdbc.sql("SELECT xp_total FROM users").query(Integer.class).single()).isZero();
        }
    }

    private String start(String unitId) {
        MvcTestResult started = learner.post("/api/lessons", """
                {"unitId": "%s"}""".formatted(unitId));
        assertThat(started).hasStatus(HttpStatus.CREATED);
        return body(started).get("sessionId").asString();
    }

    private MvcTestResult answer(String lesson, String exerciseId, String answer, int responseTimeMs, boolean retry) {
        return learner.post("/api/lessons/%s/attempts".formatted(lesson), """
                {"exerciseId": "%s", "answer": %s, "responseTimeMs": %d, "retry": %b}"""
                .formatted(exerciseId, answer, responseTimeMs, retry));
    }

    private void answerAllCorrectly(String lesson, int responseTimeMs, String... except) {
        CORRECT_GREETINGS_ANSWERS.entrySet().stream()
                .filter(entry -> !List.of(except).contains(entry.getKey()))
                .forEach(entry -> assertThat(answer(lesson, entry.getKey(), entry.getValue(), responseTimeMs, false))
                        .bodyJson().extractingPath("$.outcome").isEqualTo("correct"));
    }

    private UUID lessonOfAnotherLearner() {
        UUID other = jdbc.sql("INSERT INTO users (display_name, password_hash) VALUES ('Arta', 'not-a-real-hash') RETURNING id")
                .query(UUID.class).single();
        return jdbc.sql("""
                        INSERT INTO sessions (user_id, kind, unit_id, level, composed_by, exercise_ids)
                        VALUES (:user, 'lesson', 'a1_u01_greetings', 'A1.1', 'rule_based_v1', ARRAY ['ex_a1_u01_001'])
                        RETURNING id""")
                .param("user", other).query(UUID.class).single();
    }

    private static JsonNode body(MvcTestResult result) {
        return JSON.readTree(new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8));
    }

    private static List<String> exerciseIds(JsonNode lesson) {
        return StreamSupport.stream(lesson.get("exercises").spliterator(), false).map(exercise -> exercise.get("id").asString()).toList();
    }

    private static JsonNode exercise(JsonNode lesson, String id) {
        return StreamSupport.stream(lesson.get("exercises").spliterator(), false)
                .filter(exercise -> exercise.get("id").asString().equals(id))
                .findFirst()
                .orElseThrow();
    }

    private static void assertProblem(MvcTestResult result, HttpStatus status, String code) {
        assertThat(result).hasStatus(status).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }
}
