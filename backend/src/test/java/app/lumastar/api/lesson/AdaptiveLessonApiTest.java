package app.lumastar.api.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.SpaClient;
import app.lumastar.content.ContentFixture;
import app.lumastar.content.ContentLoader;
import app.lumastar.content.ContentSeeder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Lessons composed from the learner's profile (PRD F7): weak spots of other units and due reviews join the unit. */
class AdaptiveLessonApiTest extends IntegrationTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final List<String> FAMILY = List.of("ex_a1_u02_001", "ex_a1_u02_002", "ex_a1_u02_003");

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
    void theFirstLessonOfAUnitIsMadeOfTheUnit() {
        assertThat(exerciseIds(start("a1_u02_family"))).containsExactlyInAnyOrderElementsOf(FAMILY);
    }

    @Test
    void weakSpotsOfAnotherUnitJoinTheLesson() {
        String greetings = start("a1_u01_greetings").get("sessionId").asString();
        for (String exercise : List.of("ex_a1_u01_001", "ex_a1_u01_003", "ex_a1_u01_005")) {
            answer(greetings, exercise, wrongAnswer(exercise));
        }

        List<String> family = exerciseIds(start("a1_u02_family"));

        assertThat(family).containsAll(FAMILY).hasSize(FAMILY.size() + 3);
        assertThat(family).filteredOn(id -> id.startsWith("ex_a1_u01_")).hasSize(3);
    }

    @Test
    void dueReviewsJoinTheLesson() {
        String greetings = start("a1_u01_greetings").get("sessionId").asString();
        answer(greetings, "ex_a1_u01_001", "{\"choice\": \"Mirëdita\"}");
        jdbc.sql("UPDATE srs_cards SET due = now() - interval '1 day'").update();
        // a strong learner: no weak spots, so the review is the only exercise from another unit
        jdbc.sql("UPDATE skill_mastery SET mastery = 0.95").update();

        List<String> family = exerciseIds(start("a1_u02_family"));

        assertThat(family).containsAll(FAMILY).hasSize(FAMILY.size() + 1);
        assertThat(family).filteredOn(id -> id.startsWith("ex_a1_u01_")).singleElement()
                .satisfies(id -> assertThat(itemIdsOf(id)).contains("item_miredita"));
    }

    private static String wrongAnswer(String exercise) {
        return switch (exercise) {
            case "ex_a1_u01_001" -> "{\"choice\": \"Po\"}";
            default -> "{\"tokens\": [\"zzz\"]}";
        };
    }

    private List<String> itemIdsOf(String exercise) {
        return jdbc.sql("SELECT unnest(item_ids) FROM exercises WHERE id = :id").param("id", exercise).query(String.class).list();
    }

    private JsonNode start(String unitId) {
        MvcTestResult started = learner.post("/api/lessons", """
                {"unitId": "%s"}""".formatted(unitId));
        assertThat(started).hasStatus(HttpStatus.CREATED);
        return JSON.readTree(new String(started.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8));
    }

    private void answer(String lesson, String exercise, String answer) {
        assertThat(learner.post("/api/lessons/%s/attempts".formatted(lesson), """
                {"exerciseId": "%s", "answer": %s, "responseTimeMs": 3000}""".formatted(exercise, answer))).hasStatusOk();
    }

    private static List<String> exerciseIds(JsonNode lesson) {
        return StreamSupport.stream(lesson.get("exercises").spliterator(), false).map(exercise -> exercise.get("id").asString())
                .toList();
    }
}
