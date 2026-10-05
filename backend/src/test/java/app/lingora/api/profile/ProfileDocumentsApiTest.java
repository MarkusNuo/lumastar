package app.lingora.api.profile;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.SpaClient;
import app.lingora.content.ContentFixture;
import app.lingora.content.ContentLoader;
import app.lingora.content.ContentSeeder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/** The profile documents of PRD 8.3 generated from what the learner did through the lesson API. */
class ProfileDocumentsApiTest extends IntegrationTest {

    private static final String DOCUMENTS = "/api/profile/documents/";
    private static final JsonMapper JSON = JsonMapper.builder().build();

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

    @Test
    void servesEveryDocumentWithItsMediaType() {
        Map.of("learner_profile.json", MediaType.APPLICATION_JSON, "skill_mastery.json", MediaType.APPLICATION_JSON,
                        "recent_errors.json", MediaType.APPLICATION_JSON, "learning_plan.json", MediaType.APPLICATION_JSON,
                        "learner_summary.md", MediaType.parseMediaType("text/markdown;charset=UTF-8"))
                .forEach((name, mediaType) -> assertThat(learner.get(DOCUMENTS + name))
                        .hasStatusOk()
                        .hasContentType(mediaType));
    }

    @Test
    void theLearnerProfileOfANewAccount() {
        assertThat(learner.get(DOCUMENTS + "learner_profile.json")).bodyJson().isStrictlyEqualTo("""
                {"schemaVersion": 3, "displayName": "Erza", "variety": "gheg-kosovo", "motivation": [],
                 "dailyGoalMinutes": 10, "currentLevel": null, "targetLevel": "C2", "xpTotal": 0,
                 "streak": {"current": 0, "longest": 0}}""");
    }

    @Test
    void masteryAndErrorsFollowTheAnswers() {
        playFamilyLessonWithOneMistake();
        String today = LocalDate.now(ZoneId.of("Europe/Zurich")).toString();

        assertThat(learner.get(DOCUMENTS + "skill_mastery.json")).bodyJson().isStrictlyEqualTo("""
                {"grammar.definite_article.fem": {"mastery": 0.33, "attempts": 2, "correct": 1, "lastPracticed": "%1$s"},
                 "vocab.family": {"mastery": 0.5, "attempts": 1, "correct": 1, "lastPracticed": "%1$s"},
                 "vocab.home": {"mastery": 0.0, "attempts": 1, "correct": 0, "lastPracticed": "%1$s"}}""".formatted(today));
        MvcTestResult errors = learner.get(DOCUMENTS + "recent_errors.json");
        assertThat(errors).bodyJson().extractingPath("$.length()").isEqualTo(1);
        assertThat(errors).bodyJson().extractingPath("$[0]").isEqualTo(Map.of(
                "ts", JSON.readTree(errors.getResponse().getContentAsByteArray()).get(0).get("ts").asString(),
                "exerciseType", "translate_free",
                "skillTags", List.of("grammar.definite_article.fem", "vocab.home"),
                "errorCategory", "grammar.definite_article",
                "prompt", "Das Haus ist gross.",
                "expected", "Shpija âsht e madhe.",
                "given", "Shpi âsht e madhe."));
    }

    @Test
    void theSummaryIsMarkdownForTheClipboard() {
        playFamilyLessonWithOneMistake();

        MvcTestResult summary = learner.get("/api/profile/summary");

        assertThat(summary).hasStatusOk().hasContentType(MediaType.parseMediaType("text/markdown;charset=UTF-8"));
        assertThat(text(summary))
                .startsWith("# Lernstand Erza – ")
                .contains("""
                        - Niveau: noch nicht eingestuft (Ziel C2), 0 Tage Streak, 0 Wörter
                        - Aktuelle Einheit: noch keine
                        - Stärken: noch keine
                        - Schwächen: noch keine
                        - Häufige Fehler (30 Tage): bestimmter Artikel 1×
                        - Letzte typische Fehler:
                          - Aufgabe „Das Haus ist gross“: „Shpi âsht e madhe“ → „Shpija âsht e madhe“ (bestimmter Artikel)
                        """);
        assertThat(text(summary))
                .isEqualTo(new String(learner.get(DOCUMENTS + "learner_summary.md").getResponse().getContentAsByteArray(),
                        StandardCharsets.UTF_8));
    }

    @Test
    void theLearningPlanIsEmptyUntilAPlanExists() {
        assertThat(learner.get(DOCUMENTS + "learning_plan.json")).bodyJson().isStrictlyEqualTo("""
                {"generatedAt": null, "generatedBy": null, "startLevel": null, "stages": [], "estimates": {}}""");
    }

    @Test
    void theLearningPlanIsTheNewestPlanWithTheLiveStatusOfItsUnits() {
        storePlan(1, "planned", "planned");
        storePlan(2, "completed", "planned");

        assertThat(learner.get(DOCUMENTS + "learning_plan.json")).bodyJson().isStrictlyEqualTo("""
                {"generatedAt": "2026-09-25T10:05:00Z", "generatedBy": "rule_based_v1", "startLevel": "A1.1",
                 "stages": [{"level": "A1.1", "units": [
                   {"unitId": "a1_u01_greetings", "title": "Begrüssung", "status": "completed", "estimatedLessons": 4},
                   {"unitId": "a1_u02_family", "title": "Familie", "status": "in_progress", "estimatedLessons": 5}]}],
                 "estimates": {"A1": "2026-10-20"}}""");
        assertThat(text(learner.get("/api/profile/summary"))).contains("- Aktuelle Einheit: Familie (A1.1)");
    }

    @Test
    void rejectsUnknownDocuments() {
        MvcTestResult unknown = learner.get(DOCUMENTS + "password.json");

        assertThat(unknown).hasStatus(HttpStatus.NOT_FOUND).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(unknown).bodyJson().extractingPath("$.code").isEqualTo("document_not_found");
    }

    @Test
    void requiresASignedInLearner() {
        SpaClient stranger = new SpaClient(mvc);

        assertThat(stranger.get(DOCUMENTS + "learner_profile.json")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(stranger.get("/api/profile/summary")).hasStatus(HttpStatus.UNAUTHORIZED)
                .bodyJson().extractingPath("$.code").isEqualTo("authentication_required");
    }

    private void playFamilyLessonWithOneMistake() {
        MvcTestResult started = learner.post("/api/lessons", """
                {"unitId": "a1_u02_family"}""");
        String lesson = JSON.readTree(started.getResponse().getContentAsByteArray()).get("sessionId").asString();
        assertThat(learner.post("/api/lessons/%s/attempts".formatted(lesson), """
                {"exerciseId": "ex_a1_u02_002", "answer": {"text": "Shpi âsht e madhe."}, "responseTimeMs": 5000}"""))
                .hasStatusOk();
        assertThat(learner.post("/api/lessons/%s/attempts".formatted(lesson), """
                {"exerciseId": "ex_a1_u02_003", "answer": {"choice": "die Mutter"}, "responseTimeMs": 3000}"""))
                .hasStatusOk();
    }

    /** A plan version as the plan generator stores it, with the status of the two A1.1 units at its calculation. */
    private void storePlan(int version, String greetings, String family) {
        jdbc.sql("""
                        INSERT INTO learning_plans (user_id, version, generated_by, plan)
                        SELECT id, :version, 'rule_based_v1', :plan::jsonb FROM users""")
                .param("version", version)
                .param("plan", """
                        {"generatedAt": "2026-09-25T10:05:00Z", "generatedBy": "rule_based_v1", "startLevel": "A1.1",
                         "stages": [{"level": "A1.1", "units": [
                           {"unitId": "a1_u01_greetings", "title": "Begrüssung", "status": "%s", "estimatedLessons": 4},
                           {"unitId": "a1_u02_family", "title": "Familie", "status": "%s", "estimatedLessons": 5}]}],
                         "estimates": {"A1": "2026-10-20"}}""".formatted(greetings, family))
                .update();
    }

    private static String text(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
