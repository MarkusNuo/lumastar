package app.lingora.api.placement;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
import app.lingora.PlacementDriver;
import app.lingora.PlacementDriver.Placement;
import app.lingora.SpaClient;
import app.lingora.SyntheticContent;
import app.lingora.content.ContentSeeder;
import app.lingora.domain.Level;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/** The placement test against a synthetic bank shaped like the real one (six items per stage, A0–C2.3). */
class PlacementApiTest extends IntegrationTest {

    private static final Set<String> ITEM_FIELDS =
            Set.of("id", "type", "competence", "prompt", "answerLang", "choices", "wordBank", "tokens", "text", "reviewed");

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

    @Nested
    class Start {

        @Test
        void startsAtTheSelfAssessedLevelWithAVocabularyItem() {
            driver.answerOnboarding("simple_sentences");

            JsonNode started = driver.start();

            assertThat(started.get("startLevel").asString()).isEqualTo("A1.3");
            assertThat(started.get("position").asInt()).isEqualTo(1);
            assertThat(started.get("maxItems").asInt()).isEqualTo(20);
            assertThat(started.get("item").get("competence").asString()).isEqualTo("vocabulary");
            assertThat(driver.levelOf(started.get("item"))).isEqualTo(Level.A1_3);
            assertThat(jdbc.sql("SELECT status || '|' || start_level || '|' || engine FROM placement_tests")
                    .query(String.class).single()).isEqualTo("in_progress|A1.3|rule_based_v1");
        }

        @Test
        void needsTheOnboardingAnswersFirst() {
            assertProblem(learner.post("/api/placement", ""), HttpStatus.CONFLICT, "onboarding_incomplete");
        }

        @Test
        void abandonsAnUnfinishedTest() {
            driver.answerOnboarding("few_words");
            JsonNode first = driver.start();

            JsonNode second = driver.start();

            assertThat(second.get("testId")).isNotEqualTo(first.get("testId"));
            assertThat(jdbc.sql("SELECT status FROM placement_tests WHERE id = :id")
                    .param("id", UUID.fromString(first.get("testId").asString())).query(String.class).single())
                    .isEqualTo("abandoned");
            assertProblem(learner.post("/api/placement/" + first.get("testId").asString() + "/answers",
                    driver.answerJson(first.get("item"), true)), HttpStatus.CONFLICT, "placement_finished");
        }

        @Test
        void requiresSignInAndTheCsrfToken() {
            driver.answerOnboarding("few_words");

            assertProblem(learner.postWithoutCsrfHeader("/api/placement", ""), HttpStatus.FORBIDDEN, "csrf_invalid");
            SpaClient stranger = new SpaClient(mvc);
            stranger.get("/api/auth/status");
            assertProblem(stranger.post("/api/placement", ""), HttpStatus.UNAUTHORIZED, "authentication_required");
        }
    }

    @Nested
    class Items {

        @Test
        void carryNeitherSolutionsNorFeedback() {
            driver.answerOnboarding("everyday_conversation");
            JsonNode started = driver.start();
            JsonNode item = started.get("item");
            String testId = started.get("testId").asString();

            for (int i = 0; i < 8 && item != null; i++) {
                assertThat(item.propertyNames()).isSubsetOf(ITEM_FIELDS);
                MvcTestResult answered = learner.post("/api/placement/" + testId + "/answers", driver.answerJson(item, i % 3 != 0));
                JsonNode response = PlacementDriver.body(answered);
                assertThat(response.propertyNames()).isSubsetOf(Set.of("finished", "nextItem", "position"));
                item = response.get("nextItem");
            }
        }

        @Test
        void countThePositionUp() {
            driver.answerOnboarding("few_words");
            JsonNode started = driver.start();

            MvcTestResult answered = learner.post("/api/placement/" + started.get("testId").asString() + "/answers",
                    driver.answerJson(started.get("item"), true));

            assertThat(answered).hasStatusOk().bodyJson().extractingPath("$.position").isEqualTo(2);
            assertThat(answered).bodyJson().extractingPath("$.finished").isEqualTo(false);
            assertThat(jdbc.sql("""
                            SELECT position || '|' || exercise_id || '|' || outcome || '|' || response_ms FROM placement_answers""")
                    .query(String.class).single())
                    .isEqualTo("1|" + started.get("item").get("id").asString() + "|correct|3000");
        }

        @Test
        void acceptOnlyTheItemShown() {
            driver.answerOnboarding("few_words");
            JsonNode started = driver.start();
            String testId = started.get("testId").asString();

            assertProblem(learner.post("/api/placement/" + testId + "/answers", """
                    {"exerciseId": "pl_c2_3_001", "answer": {"text": "po"}, "responseTimeMs": 1000}"""),
                    HttpStatus.UNPROCESSABLE_CONTENT, "unexpected_placement_item");
            assertProblem(learner.post("/api/placement/" + testId + "/answers", """
                    {"exerciseId": "%s", "answer": {"mistakes": 0}, "responseTimeMs": 1000}"""
                    .formatted(started.get("item").get("id").asString())),
                    HttpStatus.UNPROCESSABLE_CONTENT, "answer_type_mismatch");
            assertProblem(learner.post("/api/placement/" + testId + "/answers", """
                    {"exerciseId": "%s", "answer": {}, "responseTimeMs": -1}""".formatted(started.get("item").get("id").asString())),
                    HttpStatus.BAD_REQUEST, "validation_failed");
            assertThat(jdbc.sql("SELECT count(*) FROM placement_answers").query(Integer.class).single()).isZero();
        }

        @Test
        void belongToTheirLearnerOnly() {
            UUID other = new LearnerFixture(jdbc).learner("Arta");
            UUID foreignTest = jdbc.sql("""
                            INSERT INTO placement_tests (user_id, status, engine, start_level, current_level)
                            VALUES (:user, 'in_progress', 'rule_based_v1', 'A0', 'A0') RETURNING id""")
                    .param("user", other).query(UUID.class).single();

            assertProblem(learner.post("/api/placement/" + foreignTest + "/answers", """
                    {"exerciseId": "pl_a0_001", "answer": {"choice": "Guten Tag"}, "responseTimeMs": 1000}"""),
                    HttpStatus.NOT_FOUND, "placement_not_found");
            assertProblem(learner.get("/api/placement/" + foreignTest + "/result"), HttpStatus.NOT_FOUND, "placement_not_found");
        }
    }

    @Nested
    class Result {

        @Test
        void aBeginnerIsPlacedOnA0WithinSixItems() {
            driver.answerOnboarding("few_words");

            Placement placement = driver.place(level -> false);

            assertThat(placement.items()).hasSizeLessThanOrEqualTo(6);
            assertThat(placement.level()).isEqualTo(Level.A0);
            assertThat(placement.result().get("skipped").asBoolean()).isFalse();
            assertThat(placement.result().get("levelTitle").asString()).isEqualTo("Stufe A0");
            assertThat(placement.result().get("answeredCount").asInt()).isEqualTo(placement.items().size());
            assertThat(placement.result().get("strengths")).isEmpty();
            assertThat(placement.result().get("weaknesses")).isNotEmpty();
            assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.onboardingStep").isEqualTo("done");
            assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.currentLevel").isEqualTo("A0");
        }

        @Test
        void aLearnerWhoKnowsA2_1IsPlacedThere() {
            driver.answerOnboarding("simple_sentences");

            Placement placement = driver.place(level -> !level.isAbove(Level.A2_1));

            assertThat(placement.level()).isEqualTo(Level.A2_1);
            assertThat(placement.result().get("strengths")).isNotEmpty();
            JsonNode strength = placement.result().get("strengths").get(0);
            assertThat(strength.get("label").asString()).isNotEqualTo(strength.get("skillTag").asString());
            assertThat(strength.get("mastery").asDouble()).isGreaterThanOrEqualTo(0.7);
            assertThat(placement.result().get("competences")).extracting(node -> node.get("competence").asString())
                    .containsExactly("vocabulary", "grammar", "reading", "translation");
            assertThat(jdbc.sql("SELECT status || '|' || result_level FROM placement_tests").query(String.class).single())
                    .isEqualTo("completed|A2.1");
            assertThat(jdbc.sql("SELECT count(*) FROM placement_answers").query(Integer.class).single())
                    .isEqualTo(placement.items().size());
        }

        @Test
        void seedsTheInitialMasteryOfTheAnsweredTags() {
            driver.answerOnboarding("few_words");

            Placement placement = driver.place(level -> !level.isAbove(Level.A1_2));

            List<String> answeredTags = jdbc.sql("""
                            SELECT DISTINCT unnest(e.skill_tags) FROM placement_answers a JOIN exercises e ON e.id = a.exercise_id""")
                    .query(String.class).list();
            assertThat(jdbc.sql("SELECT skill_tag FROM skill_mastery WHERE attempts = 0").query(String.class).list())
                    .containsExactlyInAnyOrderElementsOf(answeredTags);
            assertThat(jdbc.sql("SELECT mastery FROM skill_mastery").query(Double.class).list())
                    .allSatisfy(mastery -> assertThat(mastery).isBetween(0.3, 0.9))
                    .contains(0.3);
            assertThat(placement.result().get("finishedAt").asString()).isNotBlank();
        }

        @Test
        void isOnlyAvailableOnceTheTestIsOver() {
            driver.answerOnboarding("few_words");
            JsonNode started = driver.start();

            assertProblem(learner.get("/api/placement/" + started.get("testId").asString() + "/result"),
                    HttpStatus.CONFLICT, "placement_not_finished");
            assertProblem(learner.get("/api/placement/" + UUID.randomUUID() + "/result"),
                    HttpStatus.NOT_FOUND, "placement_not_found");
        }

        @Test
        void aFinishedTestTakesNoMoreAnswers() {
            driver.answerOnboarding("nothing");
            JsonNode started = driver.start();
            Placement placement = driver.finish(started, level -> false);

            assertProblem(learner.post("/api/placement/" + placement.testId() + "/answers",
                    driver.answerJson(started.get("item"), true)), HttpStatus.CONFLICT, "placement_finished");
        }
    }

    @Nested
    class Skip {

        @Test
        void anAbsoluteBeginnerStartsAtA0() {
            driver.answerOnboarding("nothing");

            MvcTestResult skipped = learner.post("/api/placement/skip", "");

            assertThat(skipped).hasStatusOk().bodyJson().extractingPath("$.level").isEqualTo("A0");
            assertThat(skipped).bodyJson().extractingPath("$.skipped").isEqualTo(true);
            assertThat(skipped).bodyJson().extractingPath("$.answeredCount").isEqualTo(0);
            assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.onboardingStep").isEqualTo("done");
            assertThat(jdbc.sql("SELECT status || '|' || result_level FROM placement_tests").query(String.class).single())
                    .isEqualTo("skipped|A0");
            String testId = PlacementDriver.body(skipped).get("testId").asString();
            assertThat(learner.get("/api/placement/" + testId + "/result")).hasStatusOk()
                    .bodyJson().extractingPath("$.skipped").isEqualTo(true);
        }

        @Test
        void isOnlyForAbsoluteBeginnersBeforeTheirFirstPlacement() {
            driver.answerOnboarding("few_words");
            assertProblem(learner.post("/api/placement/skip", ""), HttpStatus.CONFLICT, "placement_not_skippable");

            driver.answerOnboarding("nothing");
            driver.place(level -> false);
            assertProblem(learner.post("/api/placement/skip", ""), HttpStatus.CONFLICT, "placement_not_skippable");
        }
    }

    @Nested
    class Replacement {

        @Test
        void startsAtTheCurrentLevelAndMovesTheLearner() {
            driver.answerOnboarding("few_words");
            driver.place(level -> false);

            JsonNode again = driver.start();
            Placement replacement = driver.finish(again, level -> !level.isAbove(Level.A1_2));

            assertThat(again.get("startLevel").asString()).isEqualTo("A0");
            assertThat(replacement.level()).isEqualTo(Level.A1_2);
            assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.currentLevel").isEqualTo("A1.2");
        }

        @Test
        void neverLowersAnEstimatedMastery() {
            driver.answerOnboarding("few_words");
            driver.place(level -> !level.isAbove(Level.A1_2));
            List<String> before = masteryRows();

            driver.place(level -> false);

            List<String> after = masteryRows();
            assertThat(after).containsAll(before);
        }

        private List<String> masteryRows() {
            return jdbc.sql("SELECT skill_tag || '=' || mastery FROM skill_mastery WHERE mastery > 0.3 ORDER BY skill_tag")
                    .query(String.class).list();
        }
    }

    private static void assertProblem(MvcTestResult result, HttpStatus status, String code) {
        assertThat(result).hasStatus(status).bodyJson().extractingPath("$.code").isEqualTo(code);
    }
}
