package app.lingora.api.settings;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.PlacementDriver;
import app.lingora.SpaClient;
import app.lingora.SyntheticContent;
import app.lingora.content.ContentSeeder;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/** The learner's settings: daily goal, FSRS target retention and time zone. */
class SettingsApiTest extends IntegrationTest {

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;

    @BeforeEach
    void signedInLearnerWithSyntheticContent() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(SyntheticContent.bundle());
        learner = new SpaClient(mvc);
        learner.register("Erza");
    }

    @Test
    void aNewLearnerHasTheDefaults() {
        assertThat(learner.get("/api/settings")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"dailyGoalMinutes": 10, "requestRetention": 0.9, "timeZone": "Europe/Zurich"}""");
    }

    @Test
    void storesTheSettingsAndKeepsOtherPreferences() {
        jdbc.sql("UPDATE users SET settings = '{\"sounds\": true}'").update();

        MvcTestResult updated = learner.put("/api/settings", """
                {"dailyGoalMinutes": 20, "requestRetention": 0.85, "timeZone": "America/New_York"}""");

        assertThat(updated).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"dailyGoalMinutes": 20, "requestRetention": 0.85, "timeZone": "America/New_York"}""");
        assertThat(learner.get("/api/settings")).bodyJson().isStrictlyEqualTo("""
                {"dailyGoalMinutes": 20, "requestRetention": 0.85, "timeZone": "America/New_York"}""");
        assertThat(jdbc.sql("SELECT settings::text FROM users").query(String.class).single())
                .isEqualTo("{\"sounds\": true, \"requestRetention\": 0.85}");
        assertThat(jdbc.sql("SELECT daily_goal_minutes || '|' || time_zone FROM users").query(String.class).single())
                .isEqualTo("20|America/New_York");
    }

    @Test
    void acceptsTheBoundsOfTheTargetRetention() {
        assertThat(learner.put("/api/settings", settings(10, "0.70", "Europe/Zurich"))).hasStatusOk();
        assertThat(learner.put("/api/settings", settings(10, "0.99", "Europe/Zurich"))).hasStatusOk()
                .bodyJson().extractingPath("$.requestRetention").isEqualTo(0.99);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0.69", "0.995", "1", "0"})
    void rejectsATargetRetentionOutsideItsRange(String retention) {
        assertRejected(settings(10, retention, "Europe/Zurich"), "requestRetentionAllowed");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 7, 30})
    void rejectsADailyGoalThatIsNoOption(int goal) {
        assertRejected(settings(goal, "0.9", "Europe/Zurich"), "dailyGoalMinutesAllowed");
    }

    @ParameterizedTest
    @ValueSource(strings = {"Mars/Olympus", "+02:00", "europe/zurich", "CEST"})
    void rejectsATimeZoneThatIsNotIana(String zone) {
        assertRejected(settings(10, "0.9", zone), "timeZoneKnown");
    }

    @Test
    void requiresEverySetting() {
        MvcTestResult rejected = learner.put("/api/settings", "{}");

        assertThat(rejected).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[*].field")
                .isEqualTo(List.of("dailyGoalMinutes", "requestRetention", "timeZone"));
    }

    @Test
    void aChangedDailyGoalRecalculatesThePlanEstimates() {
        PlacementDriver placement = new PlacementDriver(learner, jdbc);
        placement.answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
        String estimatesBefore = estimates();

        assertThat(learner.put("/api/settings", settings(15, "0.9", "Europe/Zurich"))).hasStatusOk();
        assertThat(learner.put("/api/settings", settings(15, "0.8", "Europe/Zurich"))).hasStatusOk();

        JsonNode latest = PlacementDriver.body(learner.get("/api/plan/changes")).get(0);
        assertThat(latest.get("reason").asString()).isEqualTo("Tagesziel geändert: 10 → 15 Min. pro Tag");
        assertThat(latest.get("trigger").asString()).isEqualTo("manual");
        assertThat(latest.get("planVersion").asInt()).as("the retention alone leaves the plan").isEqualTo(2);
        assertThat(estimates()).isNotEqualTo(estimatesBefore);
    }

    @Test
    void requiresASignedInLearnerAndTheCsrfToken() {
        assertThat(new SpaClient(mvc).get("/api/settings")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(learner.putWithoutCsrfHeader("/api/settings", settings(15, "0.9", "Europe/Zurich")))
                .hasStatus(HttpStatus.FORBIDDEN);
        assertThat(jdbc.sql("SELECT daily_goal_minutes FROM users").query(Integer.class).single()).isEqualTo(10);
    }

    private String estimates() {
        return PlacementDriver.body(learner.get("/api/plan")).get("estimates").toString();
    }

    private void assertRejected(String body, String field) {
        MvcTestResult rejected = learner.put("/api/settings", body);

        assertThat(rejected).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.code").isEqualTo("validation_failed");
        assertThat(rejected).bodyJson().extractingPath("$.errors[*].field").isEqualTo(List.of(field));
    }

    private static String settings(int dailyGoalMinutes, String requestRetention, String timeZone) {
        return """
                {"dailyGoalMinutes": %d, "requestRetention": %s, "timeZone": "%s"}"""
                .formatted(dailyGoalMinutes, requestRetention, timeZone);
    }
}
