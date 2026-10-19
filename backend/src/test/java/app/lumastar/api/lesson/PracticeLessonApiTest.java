package app.lumastar.api.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.LessonDriver;
import app.lumastar.PlacementDriver;
import app.lumastar.SpaClient;
import app.lumastar.SyntheticContent;
import app.lumastar.content.ContentSeeder;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/** Practice lessons on a chosen skill tag (PRD F10 "Gezielt üben") against the synthetic content, learner on A0. */
class PracticeLessonApiTest extends IntegrationTest {

    private static final String PRACTISE_A0_WORDS = """
            {"kind": "practice", "skillTag": "vocab.a0"}""";

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;
    private LessonDriver lessons;

    @BeforeEach
    void learnerOnA0() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(SyntheticContent.bundle());
        learner = new SpaClient(mvc);
        learner.register("Erza");
        new PlacementDriver(learner, jdbc).answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
        lessons = new LessonDriver(learner);
    }

    @Test
    void practisesTheExercisesOfTheSkillTag() {
        JsonNode lesson = lessons.start(PRACTISE_A0_WORDS);

        assertThat(lesson.get("kind").asString()).isEqualTo("practice");
        assertThat(lesson.get("unitId").asString()).isEqualTo("practice_vocab.a0");
        List<JsonNode> exercises = StreamSupport.stream(lesson.get("exercises").spliterator(), false).toList();
        assertThat(exercises).extracting(exercise -> exercise.get("id").asString())
                .containsExactlyInAnyOrder("ex_a0_001", "ex_a0_002", "ex_a0_003");
        assertThat(exercises).allSatisfy(exercise -> assertThat(exercise.get("skillTags").get(0).asString()).isEqualTo("vocab.a0"));
    }

    @Test
    void isPlayedLikeAnyLessonAndKeptAsAPracticeSession() {
        JsonNode lesson = lessons.start(PRACTISE_A0_WORDS);
        lessons.answerAll(lesson, "ja");

        JsonNode result = lessons.complete(lesson);

        assertThat(result.get("kind").asString()).isEqualTo("practice");
        assertThat(result.get("xpEarned").asInt()).isEqualTo(20);
        assertThat(jdbc.sql("""
                        SELECT kind || '|' || coalesce(unit_id, '-') || '|' || array_to_string(focus_skill_tags, ',') || '|' || level
                        FROM sessions""").query(String.class).single()).isEqualTo("practice|-|vocab.a0|A0");
        assertThat(learner.get("/api/path")).as("a practice lesson is no lesson of a unit").bodyJson()
                .extractingPath("$.stages[*].units[?(@.unitId == 'a0_words')].lessonsCompleted").isEqualTo(List.of(0));
    }

    @Test
    void thereIsNothingToPractiseAboveTheLearnersLevel() {
        assertNoExercises("vocab.a1_1");
    }

    @Test
    void thereIsNothingToPractiseForAnUnknownTag() {
        assertNoExercises("grammar.nothing_here");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"kind\": \"practice\"}",
            "{\"kind\": \"practice\", \"skillTag\": \"Wortschatz\"}",
            "{\"kind\": \"practice\", \"skillTag\": \"vocab.a0\", \"unitId\": \"a0_words\"}",
            "{\"skillTag\": \"vocab.a0\"}",
            "{\"kind\": \"lesson\"}",
            "{\"kind\": \"review\", \"unitId\": \"a0_words\"}"})
    void rejectsRequestsThatMixUpLessonAndPractice(String request) {
        assertThat(learner.post("/api/lessons", request)).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void reportsAMissingOrMisplacedUnitOrSkillTagOnItsField() {
        assertFieldErrors("{\"kind\": \"practice\", \"unitId\": \"a0_words\"}", List.of(
                Map.of("field", "skillTag", "message", "is required for a practice lesson"),
                Map.of("field", "unitId", "message", "must be absent for a practice lesson")));
        assertFieldErrors("{\"skillTag\": \"vocab.a0\"}", List.of(
                Map.of("field", "skillTag", "message", "must be absent for a lesson"),
                Map.of("field", "unitId", "message", "is required for a lesson")));
    }

    private void assertFieldErrors(String request, List<Map<String, String>> errors) {
        MvcTestResult rejected = learner.post("/api/lessons", request);

        assertThat(rejected).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.code").isEqualTo("validation_failed");
        assertThat(rejected).bodyJson().extractingPath("$.errors").isEqualTo(errors);
    }

    @Test
    void aLessonOfAUnitNeedsNoKind() {
        assertThat(lessons.start("""
                {"kind": "lesson", "unitId": "a0_words"}""").get("kind").asString()).isEqualTo("lesson");
    }

    @Test
    void requiresASignedInLearnerAndTheCsrfToken() {
        SpaClient stranger = new SpaClient(mvc);
        stranger.get("/api/auth/status");
        assertThat(stranger.post("/api/lessons", PRACTISE_A0_WORDS)).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(learner.postWithoutCsrfHeader("/api/lessons", PRACTISE_A0_WORDS)).hasStatus(HttpStatus.FORBIDDEN);
    }

    private void assertNoExercises(String skillTag) {
        MvcTestResult rejected = learner.post("/api/lessons", """
                {"kind": "practice", "skillTag": "%s"}""".formatted(skillTag));

        assertThat(rejected).hasStatus(HttpStatus.CONFLICT).bodyJson().extractingPath("$.code")
                .isEqualTo("no_practice_exercises");
    }
}
