package app.lumastar.api.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.SpaClient;
import app.lumastar.content.ContentFixture;
import app.lumastar.content.ContentLoader;
import app.lumastar.content.ContentSeeder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Review summary and review lessons of the due items against the content fixture. */
class ReviewApiTest extends IntegrationTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Map<String, String> CORRECT_ANSWERS = Map.of(
            "ex_a1_u01_001", "{\"choice\": \"Mirëdita\"}",
            "ex_a1_u01_002", "{\"text\": \"si je\"}",
            "ex_a1_u01_003", "{\"tokens\": [\"Guten\", \"Tag\", \"wie\", \"geht\", \"es\", \"dir\"]}",
            "ex_a1_u01_004", "{\"wrongMatches\": []}",
            "ex_a1_u01_005", "{\"tokens\": [\"Mirëdita\", \"si\", \"je\"]}",
            "ex_a1_u02_001", "{\"choice\": \"âsht\"}",
            "ex_a1_u02_002", "{\"text\": \"Shpija âsht e madhe.\"}",
            "ex_a1_u02_003", "{\"choice\": \"die Mutter\"}");

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
        learner.register("Erza");
    }

    @Test
    void theSummaryOfANewLearnerIsEmpty() {
        assertThat(learner.get("/api/review/summary")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"dueNow": 0, "dueTomorrow": 0, "totalCards": 0}""");
    }

    @Test
    void theSummaryCountsTheCardsDueNowAndDuringTomorrow() {
        playLesson("a1_u01_greetings");
        jdbc.sql("UPDATE srs_cards SET due = now() + interval '10 days'").update();
        jdbc.sql("UPDATE srs_cards SET due = now() - interval '1 hour' WHERE item_id IN ('item_po', 'item_jo')").update();
        jdbc.sql("""
                UPDATE srs_cards SET due = (date_trunc('day', now() AT TIME ZONE 'Europe/Zurich') + interval '1 day 12 hours')
                                           AT TIME ZONE 'Europe/Zurich'
                WHERE item_id = 'item_faleminderit'""").update();

        assertThat(learner.get("/api/review/summary")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"dueNow": 2, "dueTomorrow": 1, "totalCards": 6}""");
    }

    @Test
    void aReviewLessonPractisesTheDueItemsInTheUsualLessonFlow() {
        playLesson("a1_u01_greetings");
        playLesson("a1_u02_family");
        jdbc.sql("UPDATE srs_cards SET due = now() - interval '1 day' WHERE item_id IN ('item_nane', 'item_po')").update();

        MvcTestResult started = learner.post("/api/review/lessons", "");

        assertThat(started).hasStatus(HttpStatus.CREATED);
        JsonNode lesson = body(started);
        assertThat(lesson.get("kind").asString()).isEqualTo("review");
        assertThat(lesson.get("unitId").asString()).isEqualTo("review");
        List<JsonNode> exercises = StreamSupport.stream(lesson.get("exercises").spliterator(), false).toList();
        assertThat(exercises).hasSize(2).allSatisfy(exercise -> assertThat(itemIds(exercise)).containsAnyOf("item_nane", "item_po"));
        assertThat(exercises.stream().flatMap(exercise -> itemIds(exercise).stream()).collect(Collectors.toSet()))
                .contains("item_nane", "item_po");
        int repsBefore = reps("item_nane");

        JsonNode result = play(lesson);

        assertThat(result.get("kind").asString()).isEqualTo("review");
        assertThat(reps("item_nane")).isEqualTo(repsBefore + 1);
        assertThat(jdbc.sql("SELECT kind || '|' || coalesce(unit_id, '-') FROM sessions WHERE kind = 'review'")
                .query(String.class).single()).isEqualTo("review|-");
        assertThat(learner.get("/api/review/summary")).bodyJson().extractingPath("$.dueNow").isEqualTo(0);
    }

    @Test
    void aCardOfAnItemAboveTheLevelAfterARePlacementDownwardsIsCountedAndReviewed() {
        playLesson("a1_u02_family");
        jdbc.sql("UPDATE users SET current_level = 'A0'").update();
        jdbc.sql("UPDATE srs_cards SET due = now() - interval '1 day' WHERE item_id = 'item_nane'").update();

        assertThat(learner.get("/api/review/summary")).bodyJson().extractingPath("$.dueNow").isEqualTo(1);
        MvcTestResult started = learner.post("/api/review/lessons", "");

        assertThat(started).hasStatus(HttpStatus.CREATED);
        List<JsonNode> exercises = StreamSupport.stream(body(started).get("exercises").spliterator(), false).toList();
        assertThat(exercises).isNotEmpty().allSatisfy(exercise -> assertThat(itemIds(exercise)).contains("item_nane"));
        assertThat(exercises).extracting(exercise -> exercise.get("id").asString()).allMatch(id -> id.startsWith("ex_a1_u02_"));
    }

    @Test
    void aCardWithoutAnyActiveExerciseIsNeitherCountedNorReviewed() {
        playLesson("a1_u01_greetings");
        jdbc.sql("UPDATE srs_cards SET due = now() - interval '1 day'").update();
        jdbc.sql("UPDATE exercises SET retired_at = now() WHERE pool = 'lesson'").update();

        assertThat(learner.get("/api/review/summary")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"dueNow": 0, "dueTomorrow": 0, "totalCards": 0}""");
        assertThat(learner.post("/api/review/lessons", "")).hasStatus(HttpStatus.CONFLICT)
                .bodyJson().extractingPath("$.code").isEqualTo("no_reviews_due");
    }

    @Test
    void thereIsNoReviewLessonWhileNothingIsDue() {
        playLesson("a1_u01_greetings");

        MvcTestResult rejected = learner.post("/api/review/lessons", "");

        assertThat(rejected).hasStatus(HttpStatus.CONFLICT).bodyJson().extractingPath("$.code").isEqualTo("no_reviews_due");
    }

    @Test
    void requiresASignedInLearnerAndTheCsrfToken() {
        assertThat(new SpaClient(mvc).get("/api/review/summary")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(learner.postWithoutCsrfHeader("/api/review/lessons", "")).hasStatus(HttpStatus.FORBIDDEN);
    }

    private void playLesson(String unitId) {
        MvcTestResult started = learner.post("/api/lessons", """
                {"unitId": "%s"}""".formatted(unitId));
        assertThat(started).hasStatus(HttpStatus.CREATED);
        play(body(started));
    }

    /** Answers every exercise of the lesson correctly and completes it. */
    private JsonNode play(JsonNode lesson) {
        String sessionId = lesson.get("sessionId").asString();
        for (JsonNode exercise : lesson.get("exercises")) {
            String id = exercise.get("id").asString();
            assertThat(learner.post("/api/lessons/%s/attempts".formatted(sessionId), """
                    {"exerciseId": "%s", "answer": %s, "responseTimeMs": 3000}""".formatted(id, CORRECT_ANSWERS.get(id))))
                    .hasStatusOk();
        }
        MvcTestResult completed = learner.post("/api/lessons/%s/complete".formatted(sessionId), "");
        assertThat(completed).hasStatusOk();
        return body(completed);
    }

    private int reps(String itemId) {
        return jdbc.sql("SELECT reps FROM srs_cards WHERE item_id = :item").param("item", itemId).query(Integer.class).single();
    }

    private static Set<String> itemIds(JsonNode exercise) {
        return StreamSupport.stream(exercise.get("itemIds").spliterator(), false).map(JsonNode::asString)
                .collect(Collectors.toSet());
    }

    private static JsonNode body(MvcTestResult result) {
        return JSON.readTree(new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8));
    }
}
