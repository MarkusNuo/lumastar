package app.lingora.api.reminder;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.SpaClient;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** The reminder settings of the learner. */
class ReminderApiTest extends IntegrationTest {

    private SpaClient learner;

    @BeforeEach
    void signedInLearner() {
        jdbc.sql("DELETE FROM users").update();
        learner = new SpaClient(mvc);
        learner.register("Erza");
    }

    @Test
    void areOffUntilTheLearnerSwitchesThemOn() {
        assertThat(learner.get("/api/reminders")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"enabled": false, "time": "19:00", "rescueEnabled": true, "rescueTime": "21:30"}""");
    }

    @Test
    void storesTheSettings() {
        MvcTestResult updated = learner.put("/api/reminders", """
                {"enabled": true, "time": "07:45", "rescueEnabled": false, "rescueTime": "06:00"}""");

        assertThat(updated).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"enabled": true, "time": "07:45", "rescueEnabled": false, "rescueTime": "06:00"}""");
        assertThat(learner.put("/api/reminders", """
                {"enabled": true, "time": "18:00", "rescueEnabled": true, "rescueTime": "23:59"}""")).hasStatusOk();
        assertThat(learner.get("/api/reminders")).bodyJson().isStrictlyEqualTo("""
                {"enabled": true, "time": "18:00", "rescueEnabled": true, "rescueTime": "23:59"}""");
        assertThat(jdbc.sql("SELECT count(*) FROM reminder_settings").query(Integer.class).single()).isOne();
    }

    @Test
    void theRescueComesAfterTheDailyReminder() {
        MvcTestResult rejected = learner.put("/api/reminders", """
                {"enabled": true, "time": "21:30", "rescueEnabled": true, "rescueTime": "21:30"}""");

        assertThat(rejected).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[*].field")
                .isEqualTo(List.of("rescueTimeAfterTime"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"7:45", "24:00", "19:60", "19:00:00", "abends", ""})
    void refusesATimeThatIsNotHhMm(String time) {
        MvcTestResult rejected = learner.put("/api/reminders", """
                {"enabled": true, "time": "%s", "rescueEnabled": false, "rescueTime": "21:30"}""".formatted(time));

        assertThat(rejected).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[*].field")
                .isEqualTo(List.of("time"));
    }

    @Test
    void requiresEverySetting() {
        assertThat(learner.put("/api/reminders", "{}")).hasStatus(HttpStatus.BAD_REQUEST).bodyJson()
                .extractingPath("$.errors[*].field").isEqualTo(List.of("enabled", "rescueEnabled", "rescueTime", "time"));
    }

    @Test
    void requiresASignedInLearnerAndTheCsrfToken() {
        assertThat(new SpaClient(mvc).get("/api/reminders")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(learner.putWithoutCsrfHeader("/api/reminders", """
                {"enabled": true, "time": "18:00", "rescueEnabled": true, "rescueTime": "21:00"}"""))
                .hasStatus(HttpStatus.FORBIDDEN);
        assertThat(jdbc.sql("SELECT count(*) FROM reminder_settings").query(Integer.class).single()).isZero();
    }
}
