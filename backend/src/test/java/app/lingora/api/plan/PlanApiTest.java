package app.lingora.api.plan;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
import app.lingora.PlacementDriver;
import app.lingora.SpaClient;
import app.lingora.SyntheticContent;
import app.lingora.content.ContentSeeder;
import app.lingora.domain.Level;
import app.lingora.export.ZipFiles;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/** Plan, plan history, learning path and focus lessons against the synthetic content (A0–C2.3, two units per stage). */
class PlanApiTest extends IntegrationTest {

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;
    private PlacementDriver driver;

    @BeforeEach
    void signedInLearnerWithSyntheticContent() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(SyntheticContent.bundle());
        learner = new SpaClient(mvc);
        learner.register("Erza");
        driver = new PlacementDriver(learner, jdbc);
    }

    /** Placed on A1.2 with vocab.a1_2 and phrase.a1_2 answered correctly on A1.2 and grammar.a1_3 wrongly. */
    private void placeOnA1_2() {
        driver.answerOnboarding("few_words");
        assertThat(driver.place(level -> !level.isAbove(Level.A1_2)).level()).isEqualTo(Level.A1_2);
    }

    /** Skips the test: placed on A0, where the word unit has exercises. */
    private void startAtA0() {
        driver.answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
    }

    private JsonNode get(String uri) {
        MvcTestResult result = learner.get(uri);
        assertThat(result).hasStatusOk();
        return PlacementDriver.body(result);
    }

    private static JsonNode unit(JsonNode pathOrPlan, String unitId) {
        return StreamSupport.stream(pathOrPlan.get("stages").spliterator(), false)
                .flatMap(stage -> StreamSupport.stream(stage.get("units").spliterator(), false))
                .filter(unit -> unit.get("unitId").asString().equals(unitId))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no unit " + unitId));
    }

    private static List<String> unitIds(JsonNode pathOrPlan) {
        return StreamSupport.stream(pathOrPlan.get("stages").spliterator(), false)
                .flatMap(stage -> StreamSupport.stream(stage.get("units").spliterator(), false))
                .map(unit -> unit.get("unitId").asString())
                .toList();
    }

    /** Plays one lesson of the unit with every answer correct. */
    private void playLesson(String unitId) {
        MvcTestResult started = learner.post("/api/lessons", """
                {"unitId": "%s"}""".formatted(unitId));
        assertThat(started).hasStatus(HttpStatus.CREATED);
        JsonNode lesson = PlacementDriver.body(started);
        String sessionId = lesson.get("sessionId").asString();
        for (JsonNode exercise : lesson.get("exercises")) {
            assertThat(learner.post("/api/lessons/" + sessionId + "/attempts", """
                    {"exerciseId": "%s", "answer": {"choice": "ja"}, "responseTimeMs": 2000}"""
                    .formatted(exercise.get("id").asString()))).hasStatusOk();
        }
        assertThat(learner.post("/api/lessons/" + sessionId + "/complete", "")).hasStatusOk();
    }

    private UUID learnerId() {
        return jdbc.sql("SELECT id FROM users").query(UUID.class).single();
    }

    /** Recent first answers with the given share of wrong ones, as the lesson API records them. */
    private void recentAnswers(String exerciseId, String skillTag, int answers, int wrong) {
        LearnerFixture fixture = new LearnerFixture(jdbc);
        Instant recently = Instant.now().minus(Duration.ofHours(1));
        UUID lesson = fixture.lesson(learnerId(), SyntheticContent.wordsUnit(Level.A0), recently);
        for (int i = 0; i < answers; i++) {
            boolean isWrong = i < wrong;
            fixture.answer(learnerId(), lesson, new LearnerFixture.Answer(exerciseId, "multiple_choice", List.of(skillTag),
                    isWrong ? "{\"choice\": \"nein\"}" : "{\"choice\": \"ja\"}", isWrong ? "wrong" : "correct",
                    isWrong ? "vocab.confused" : null, "ja", false, recently.plusSeconds(i)));
        }
    }

    /** {@code answers} correct first answers to the tag, split over two lessons, and a mastery of 0.9 from them. */
    private void practisedInTwoLessons(String skillTag, int answers) {
        LearnerFixture fixture = new LearnerFixture(jdbc);
        Instant recently = Instant.now().minus(Duration.ofHours(2));
        UUID[] lessons = {fixture.lesson(learnerId(), SyntheticContent.wordsUnit(Level.A0), recently),
                fixture.lesson(learnerId(), SyntheticContent.wordsUnit(Level.A0), recently.plusSeconds(600))};
        for (int i = 0; i < answers; i++) {
            fixture.answer(learnerId(), lessons[i % 2], new LearnerFixture.Answer("ex_a0_001", "multiple_choice",
                    List.of(skillTag), "{\"choice\": \"ja\"}", "correct", null, "ja", false, recently.plusSeconds(i)));
        }
        jdbc.sql("""
                        INSERT INTO skill_mastery (user_id, skill_tag, mastery, attempts, correct, last_practiced_at)
                        VALUES (:user, :tag, 0.9, :answers, :answers, now())
                        ON CONFLICT (user_id, skill_tag) DO UPDATE SET mastery = 0.9, attempts = :answers, correct = :answers,
                            last_practiced_at = now()""")
                .param("user", learnerId())
                .param("tag", skillTag)
                .param("answers", answers)
                .update();
    }

    private void changeDailyGoal(int minutes) {
        assertThat(learner.put("/api/onboarding", """
                {"motivations": ["family"], "dailyGoalMinutes": %d, "selfAssessment": "nothing"}""".formatted(minutes)))
                .hasStatusOk();
    }

    @Nested
    class Plan {

        @Test
        void thePlacementCreatesAPlanFromThePlacedLevelToC2() {
            placeOnA1_2();

            JsonNode plan = get("/api/plan");

            assertThat(plan.get("version").asInt()).isEqualTo(1);
            assertThat(plan.get("generatedBy").asString()).isEqualTo("rule_based_v1");
            assertThat(plan.get("startLevel").asString()).isEqualTo("A1.2");
            assertThat(plan.get("stages")).extracting(stage -> stage.get("level").asString())
                    .hasSize(17).startsWith("A1.2", "A1.3", "A2.1").endsWith("C2.3");
            assertThat(plan.get("stages").get(0).get("title").asString()).isEqualTo("Stufe A1.2");
            assertThat(plan.get("estimates").propertyNames()).containsExactly("A1", "A2", "B1", "B2", "C1", "C2");
            // placement estimates alone skip nothing (PRD F3: skipping needs practice)
            assertThat(unit(plan, "a1_2_words")).isEqualTo(PlacementDriver.JSON.readTree("""
                    {"unitId": "a1_2_words", "title": "Wörter A1.2", "status": "planned", "estimatedLessons": 4,
                     "focus": false}"""));
            assertThat(unit(plan, "a1_2_grammar").get("status").asString()).isEqualTo("planned");
        }

        @Test
        void theHistoryExplainsThePlan() {
            placeOnA1_2();

            MvcTestResult changes = learner.get("/api/plan/changes");

            assertThat(changes).hasStatusOk().bodyJson().extractingPath("$[*].reason").isEqualTo(List.of(
                    "Lernplan nach der Einstufung erstellt: A1.2 bis C2"));
            assertThat(changes).bodyJson().extractingPath("$[*].type").isEqualTo(List.of("plan_created"));
            assertThat(changes).bodyJson().extractingPath("$[0].trigger").isEqualTo("placement");
            assertThat(changes).bodyJson().extractingPath("$[0].planVersion").isEqualTo(1);
        }

        @Test
        void aReplacementRevisesThePlanWithItsReason() {
            startAtA0();

            driver.place(level -> !level.isAbove(Level.A1_2));

            JsonNode plan = get("/api/plan");
            assertThat(plan.get("version").asInt()).isEqualTo(2);
            assertThat(plan.get("startLevel").asString()).isEqualTo("A1.2");
            assertThat(unit(plan, "a1_2_grammar").get("status").asString()).isEqualTo("planned");
            assertThat(get("/api/plan/changes")).extracting(change -> change.get("reason").asString()).containsExactly(
                    "Neueinstufung: A0 → A1.2",
                    "Lernplan ab A0 erstellt, Einstufung übersprungen");
            assertThat(get("/api/plan/changes")).extracting(change -> change.get("type").asString())
                    .containsExactly("level_changed", "plan_created");
            assertThat(get("/api/plan/changes")).extracting(change -> change.get("planVersion").asInt())
                    .containsExactly(2, 1);
        }

        @Test
        void practisedMasterySkipsAUnitAtTheNextRevision() {
            placeOnA1_2();
            practisedInTwoLessons("vocab.a1_2", 8);

            changeDailyGoal(15);

            assertThat(unit(get("/api/plan"), "a1_2_words").get("status").asString()).isEqualTo("skipped");
            assertThat(get("/api/plan/changes")).extracting(change -> change.get("reason").asString())
                    .contains("Einheit ‚Wörter A1.2‘ übersprungen: bereits beherrscht");
        }

        @Test
        void sevenCorrectAnswersAreNotEnoughToSkipAUnit() {
            placeOnA1_2();
            practisedInTwoLessons("vocab.a1_2", 7);

            changeDailyGoal(15);

            assertThat(unit(get("/api/plan"), "a1_2_words").get("status").asString()).isEqualTo("planned");
        }

        @Test
        void aNewDailyGoalRecalculatesTheEstimates() {
            startAtA0();
            JsonNode before = get("/api/plan");

            changeDailyGoal(20);

            JsonNode after = get("/api/plan");
            assertThat(after.get("version").asInt()).isEqualTo(2);
            assertThat(after.get("estimates").get("C2").asString()).isLessThan(before.get("estimates").get("C2").asString());
            assertThat(get("/api/plan/changes").get(0).get("reason").asString())
                    .isEqualTo("Tagesziel geändert: 10 → 20 Min. pro Tag");
            changeDailyGoal(20);
            assertThat(get("/api/plan").get("version").asInt()).as("an unchanged goal keeps the plan").isEqualTo(2);
        }

        @Test
        void isTheLearningPlanDocument() {
            placeOnA1_2();

            JsonNode document = get("/api/profile/documents/learning_plan.json");

            assertThat(document.get("generatedBy").asString()).isEqualTo("rule_based_v1");
            assertThat(document.get("startLevel").asString()).isEqualTo("A1.2");
            assertThat(document.get("stages").get(0).get("units").get(0)).isEqualTo(PlacementDriver.JSON.readTree("""
                    {"unitId": "a1_2_words", "title": "Wörter A1.2", "status": "planned", "estimatedLessons": 4}"""));
            assertThat(document.get("estimates").has("C2")).isTrue();
        }

        @Test
        void doesNotExistBeforeThePlacement() {
            assertThat(learner.get("/api/plan")).hasStatus(HttpStatus.NOT_FOUND)
                    .bodyJson().extractingPath("$.code").isEqualTo("plan_not_found");
            assertThat(learner.get("/api/path")).hasStatus(HttpStatus.NOT_FOUND)
                    .bodyJson().extractingPath("$.code").isEqualTo("plan_not_found");
            assertThat(learner.get("/api/plan/changes")).hasStatusOk().bodyJson().isStrictlyEqualTo("[]");
        }

        @Test
        void requiresASignedInLearner() {
            SpaClient stranger = new SpaClient(mvc);
            for (String uri : List.of("/api/plan", "/api/plan/changes", "/api/path")) {
                assertThat(stranger.get(uri)).hasStatus(HttpStatus.UNAUTHORIZED);
            }
        }
    }

    @Nested
    class Path {

        @Test
        void showsTheStagesWithTheirUnitsAndLockedCheckpoints() {
            placeOnA1_2();

            JsonNode path = get("/api/path");

            assertThat(path.get("currentLevel").asString()).isEqualTo("A1.2");
            assertThat(path.get("targetLevel").asString()).isEqualTo("C2");
            assertThat(path.get("dailyGoalMinutes").asInt()).isEqualTo(10);
            assertThat(path.get("estimates").propertyNames()).contains("A1", "C2");
            JsonNode first = path.get("stages").get(0);
            assertThat(first.get("level").asString()).isEqualTo("A1.2");
            assertThat(first.get("title").asString()).isEqualTo("Stufe A1.2");
            assertThat(first.get("checkpoint").get("status").asString()).isEqualTo("locked");
            assertThat(unit(path, "a1_2_grammar")).isEqualTo(PlacementDriver.JSON.readTree("""
                    {"unitId": "a1_2_grammar", "title": "Grammatik A1.2", "color": "teal", "icon": "star", "status": "planned",
                     "focus": false, "estimatedLessons": 5, "lessonsCompleted": 0, "hasContent": false}"""));
            assertThat(unit(path, "a1_2_words").get("status").asString()).isEqualTo("planned");
        }

        @Test
        void theFirstUnitWithExercisesIsInProgressAndFollowsTheCompletedLessons() {
            startAtA0();
            assertThat(unit(get("/api/path"), "a0_words").get("status").asString()).isEqualTo("in_progress");

            playLesson("a0_words");

            JsonNode afterOne = get("/api/path");
            assertThat(unit(afterOne, "a0_words").get("status").asString()).isEqualTo("in_progress");
            assertThat(unit(afterOne, "a0_words").get("lessonsCompleted").asInt()).isEqualTo(1);
            for (int i = 0; i < 3; i++) {
                playLesson("a0_words");
            }
            JsonNode done = get("/api/path");
            assertThat(unit(done, "a0_words").get("status").asString()).isEqualTo("completed");
            assertThat(unit(done, "a0_words").get("lessonsCompleted").asInt()).isEqualTo(4);
            assertThat(unit(done, "a0_grammar").get("status").asString()).isEqualTo("planned");
            assertThat(unit(done, "a1_1_words").get("status").asString()).isEqualTo("in_progress");
        }
    }

    @Nested
    class FocusLessons {

        private static final String VOCAB_FOCUS = "focus_vocab.a0_1";

        /** vocab.a0 is weak; grammar.a0 is weaker, but no lesson exercise practises it. */
        private void weakTagsAndRevision() {
            startAtA0();
            recentAnswers("ex_a0_001", "vocab.a0", 10, 6);
            recentAnswers("pl_a0_003", "grammar.a0", 10, 7);
            changeDailyGoal(15);
        }

        @Test
        void areInsertedRightAfterTheUnitInProgressForWeakTagsWithExercises() {
            weakTagsAndRevision();

            JsonNode path = get("/api/path");

            assertThat(unitIds(path)).startsWith("a0_words", VOCAB_FOCUS, "a0_grammar");
            assertThat(unitIds(path)).noneMatch(unitId -> unitId.startsWith("focus_grammar"));
            assertThat(unit(path, VOCAB_FOCUS)).isEqualTo(PlacementDriver.JSON.readTree("""
                    {"unitId": "focus_vocab.a0_1", "title": "Fokus: Wortschatz A0", "icon": "target", "status": "planned",
                     "focus": true, "reason": "Fehlerquote 60 % bei Wortschatz A0", "estimatedLessons": 1,
                     "lessonsCompleted": 0, "hasContent": true}"""));
            assertThat(get("/api/plan/changes")).extracting(change -> change.get("reason").asString()).startsWith(
                    "Tagesziel geändert: 10 → 15 Min. pro Tag",
                    "Fokus-Lektion ‚Wortschatz A0‘ eingefügt, Fehlerquote 60 %");
        }

        @Test
        void playTheExercisesOfTheirTagAndCountAsCompleted() {
            weakTagsAndRevision();

            MvcTestResult started = learner.post("/api/lessons", """
                    {"unitId": "focus_vocab.a0_1"}""");

            assertThat(started).hasStatus(HttpStatus.CREATED).bodyJson().extractingPath("$.unitId").isEqualTo(VOCAB_FOCUS);
            assertThat(started).bodyJson().extractingPath("$.exercises[*].id").asArray()
                    .containsExactlyInAnyOrder("ex_a0_001", "ex_a0_002", "ex_a0_003");
            assertThat(jdbc.sql("""
                            SELECT kind || '|' || coalesce(unit_id, '-') || '|' || level || '|' || array_to_string(focus_skill_tags, ',')
                            FROM sessions WHERE kind = 'focus'""").query(String.class).single())
                    .isEqualTo("focus|-|A0|vocab.a0");

            playLesson(VOCAB_FOCUS);

            JsonNode focus = unit(get("/api/path"), VOCAB_FOCUS);
            assertThat(focus.get("status").asString()).isEqualTo("completed");
            assertThat(focus.get("lessonsCompleted").asInt()).isEqualTo(1);
        }

        @Test
        void mustBeInTheCurrentPlan() {
            weakTagsAndRevision();

            assertThat(learner.post("/api/lessons", """
                    {"unitId": "focus_vocab.a1_1_1"}""")).hasStatus(HttpStatus.NOT_FOUND)
                    .bodyJson().extractingPath("$.code").isEqualTo("unit_not_found");
            assertThat(learner.post("/api/lessons", """
                    {"unitId": "focus_grammar.a0_1"}""")).hasStatus(HttpStatus.NOT_FOUND)
                    .bodyJson().extractingPath("$.code").isEqualTo("unit_not_found");
        }

        @Test
        void aCompletedFocusUnitLeavesThePlanAtTheNextRevision() {
            weakTagsAndRevision();
            playLesson(VOCAB_FOCUS);

            changeDailyGoal(20);

            // 6 of 13 answers wrong: still weak, so the next focus unit of the tag follows
            assertThat(unitIds(get("/api/plan"))).doesNotContain(VOCAB_FOCUS).contains("focus_vocab.a0_2");
        }
    }

    @Test
    void theExportCarriesThePlanAndItsHistory() {
        placeOnA1_2();

        MvcTestResult export = learner.get("/api/profile/export");

        assertThat(export).hasStatusOk();
        Map<String, String> files = ZipFiles.unzip(export.getResponse().getContentAsByteArray());
        JsonNode plans = PlacementDriver.JSON.readTree(files.get("data/learning_plans.json"));
        assertThat(plans).hasSize(1);
        assertThat(plans.get(0).get("plan").get("startLevel").asString()).isEqualTo("A1.2");
        assertThat(PlacementDriver.JSON.readTree(files.get("data/plan_changes.json")))
                .extracting(change -> change.get("kind").asString()).containsExactly("plan_created");
        assertThat(PlacementDriver.JSON.readTree(files.get("documents/learning_plan.json")).get("startLevel").asString())
                .isEqualTo("A1.2");
    }
}
