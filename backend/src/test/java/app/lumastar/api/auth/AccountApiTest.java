package app.lumastar.api.auth;

import static app.lumastar.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.LearnerFixture;
import app.lumastar.MailCatcher.SentMail;
import app.lumastar.SpaClient;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Managing the signed-in account: display name, password and deletion with all learner data. */
class AccountApiTest extends IntegrationTest {

    private static final String ACCOUNT = "/api/account";
    private static final String NEW_PASSWORD = "ein-neues-passwort";

    private SpaClient learner;
    private String email;

    @BeforeEach
    void registeredLearner() {
        jdbc.sql("DELETE FROM users").update();
        learner = new SpaClient(mvc);
        email = learner.register("Erza");
    }

    @Test
    void showsTheAccount() {
        MvcTestResult account = learner.get(ACCOUNT);

        assertThat(account).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"email": "%s", "emailVerified": false, "displayName": "Erza"}""".formatted(email));
        assertThat(account).bodyJson().doesNotHavePath("$.pendingEmail");
        Instant createdAt = jdbc.sql("SELECT created_at FROM users").query(OffsetDateTime.class).single().toInstant();
        assertThat(account).bodyJson().extractingPath("$.createdAt").asString()
                .satisfies(value -> assertThat(Instant.parse(value)).isEqualTo(createdAt));
    }

    @Nested
    class DisplayName {

        @Test
        void changesTheNameShownInTheApp() {
            MvcTestResult renamed = learner.put(ACCOUNT + "/display-name", """
                    {"displayName": "  Erza B.  "}""");

            assertThat(renamed).hasStatusOk().bodyJson().extractingPath("$.displayName").isEqualTo("Erza B.");
            assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.displayName").isEqualTo("Erza B.");
        }

        @Test
        void validatesTheName() {
            for (String invalid : List.of("\"\"", "\"   \"", "\"%s\"".formatted("E".repeat(41)), "\"Erza\\tB\"", "null")) {
                assertProblem(learner.put(ACCOUNT + "/display-name", """
                        {"displayName": %s}""".formatted(invalid)), HttpStatus.BAD_REQUEST, "validation_failed");
            }
            assertThat(learner.get(ACCOUNT)).bodyJson().extractingPath("$.displayName").isEqualTo("Erza");
        }
    }

    @Nested
    class Password {

        @Test
        void changesThePasswordAndEndsOnlyTheOtherSessions() {
            SpaClient otherDevice = signedIn(SpaClient.PASSWORD);

            assertThat(learner.put(ACCOUNT + "/password", change(SpaClient.PASSWORD, NEW_PASSWORD)))
                    .hasStatus(HttpStatus.NO_CONTENT);

            assertThat(learner.get("/api/me")).hasStatusOk();
            assertProblem(otherDevice.get("/api/me"), HttpStatus.UNAUTHORIZED, "authentication_required");
            assertThat(signedIn(NEW_PASSWORD).get("/api/me")).hasStatusOk();
            SpaClient withOldPassword = new SpaClient(mvc);
            withOldPassword.get("/api/auth/status");
            assertProblem(withOldPassword.post("/api/auth/login", login(SpaClient.PASSWORD)), HttpStatus.UNAUTHORIZED,
                    "invalid_credentials");
        }

        @Test
        void cancelsAPendingEmailChangeAndTellsTheVerifiedAddress() {
            verify();
            learner.put(ACCOUNT + "/email", """
                    {"newEmail": "taken-over@example.com", "password": "%s"}""".formatted(SpaClient.PASSWORD));
            String changeLink = mails.onlyMailTo("taken-over@example.com").token();

            assertThat(learner.put(ACCOUNT + "/password", change(SpaClient.PASSWORD, NEW_PASSWORD)))
                    .hasStatus(HttpStatus.NO_CONTENT);

            assertThat(learner.get(ACCOUNT)).bodyJson().doesNotHavePath("$.pendingEmail");
            assertProblem(learner.post("/api/auth/verify-email", """
                    {"token": "%s"}""".formatted(changeLink)), HttpStatus.GONE, "token_invalid");
            assertThat(learner.get(ACCOUNT)).bodyJson().extractingPath("$.email").isEqualTo(email);
            SentMail notice = mails.lastMailTo(email);
            assertThat(notice.subject()).isEqualTo("Dein Lumastar-Passwort wurde geändert");
            assertThat(notice.text()).contains("Änderung deiner E-Mail-Adresse ist abgebrochen", "Falls du das nicht warst");
        }

        @Test
        void tellsNoUnverifiedAddress() {
            assertThat(learner.put(ACCOUNT + "/password", change(SpaClient.PASSWORD, NEW_PASSWORD)))
                    .hasStatus(HttpStatus.NO_CONTENT);

            assertThat(mails.sentTo(email)).extracting(SentMail::subject)
                    .containsExactly("Bitte bestätige deine E-Mail-Adresse");
        }

        @Test
        void requiresTheCurrentPassword() {
            assertProblem(learner.put(ACCOUNT + "/password", change("falsch-falsch", NEW_PASSWORD)), HttpStatus.FORBIDDEN,
                    "invalid_password");

            assertThat(signedIn(SpaClient.PASSWORD).get("/api/me")).hasStatusOk();
        }

        @Test
        void wrongCurrentPasswordsAreThrottledLikeFailedSignIns() {
            for (int attempt = 0; attempt < LoginThrottle.FREE_ATTEMPTS; attempt++) {
                assertProblem(learner.put(ACCOUNT + "/password", change("falsch-" + attempt, NEW_PASSWORD)),
                        HttpStatus.FORBIDDEN, "invalid_password");
            }

            assertProblem(learner.put(ACCOUNT + "/password", change(SpaClient.PASSWORD, NEW_PASSWORD)),
                    HttpStatus.TOO_MANY_REQUESTS, "login_throttled");
        }

        @Test
        void validatesTheNewPassword() {
            MvcTestResult tooShort = learner.put(ACCOUNT + "/password", change(SpaClient.PASSWORD, "kurz"));

            assertProblem(tooShort, HttpStatus.BAD_REQUEST, "validation_failed");
            assertThat(tooShort).bodyJson().extractingPath("$.errors[*].field").asArray().containsExactly("newPassword");
        }

        private String change(String currentPassword, String newPassword) {
            return """
                    {"currentPassword": "%s", "newPassword": "%s"}""".formatted(currentPassword, newPassword);
        }
    }

    @Nested
    class Deletion {

        @Test
        void deletesTheAccountWithAllItsLearnerDataAndEndsAllItsSessions() {
            UUID account = jdbc.sql("SELECT id FROM users").query(UUID.class).single();
            addLearnerData(account);
            SpaClient otherDevice = signedIn(SpaClient.PASSWORD);
            assertThat(sessionsOf(account)).isEqualTo(2);

            assertThat(learner.delete(ACCOUNT, deletion(SpaClient.PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);

            assertThat(rowsOf(account)).isZero();
            assertThat(sessionsOf(account)).isZero();
            assertProblem(learner.get("/api/me"), HttpStatus.UNAUTHORIZED, "authentication_required");
            assertProblem(otherDevice.get("/api/me"), HttpStatus.UNAUTHORIZED, "authentication_required");
            SpaClient again = new SpaClient(mvc);
            again.get("/api/auth/status");
            assertProblem(again.post("/api/auth/login", login(SpaClient.PASSWORD)), HttpStatus.UNAUTHORIZED,
                    "invalid_credentials");
        }

        @Test
        void confirmsTheDeletionToAVerifiedAddressOnly() {
            learner.delete(ACCOUNT, deletion(SpaClient.PASSWORD));
            assertThat(mails.sentTo(email)).hasSize(1);

            SpaClient verified = new SpaClient(mvc);
            String verifiedEmail = verified.register("Arta");
            verified.post("/api/auth/verify-email", """
                    {"token": "%s"}""".formatted(mails.onlyMailTo(verifiedEmail).token()));
            assertThat(verified.delete(ACCOUNT, deletion(SpaClient.PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);

            assertThat(mails.lastMailTo(verifiedEmail).subject()).isEqualTo("Dein Lumastar-Konto wurde gelöscht");
            assertThat(mails.lastMailTo(verifiedEmail).text()).startsWith("Hallo Arta\n");
        }

        @Test
        void requiresThePassword() {
            assertProblem(learner.delete(ACCOUNT, deletion("falsch-falsch")), HttpStatus.FORBIDDEN, "invalid_password");
            assertProblem(learner.delete(ACCOUNT, "{}"), HttpStatus.BAD_REQUEST, "validation_failed");

            assertThat(learner.get("/api/me")).hasStatusOk();
            assertThat(jdbc.sql("SELECT count(*) FROM users").query(Integer.class).single()).isOne();
        }

        @Test
        void requiresTheCsrfToken() {
            SpaClient forged = new SpaClient(mvc);
            forged.useSession(learner.sessionCookie());

            assertProblem(forged.delete(ACCOUNT, deletion(SpaClient.PASSWORD)), HttpStatus.FORBIDDEN, "csrf_invalid");
            assertThat(learner.get("/api/me")).hasStatusOk();
        }

        private void addLearnerData(UUID account) {
            new LearnerFixture(jdbc).lesson(account, null, Instant.parse("2026-10-01T08:00:00Z"));
            jdbc.sql("INSERT INTO streaks (user_id, current_days, longest_days) VALUES (:user, 1, 1)")
                    .param("user", account).update();
            assertThat(rowsOf(account)).isEqualTo(4);
        }

        private String deletion(String password) {
            return """
                    {"password": "%s"}""".formatted(password);
        }
    }

    /** Rows of the account in the users table and in every table with a user_id column. */
    private int rowsOf(UUID account) {
        List<String> tables = jdbc.sql("""
                        SELECT table_name FROM information_schema.columns
                        WHERE table_schema = current_schema() AND column_name = 'user_id'""")
                .query(String.class).list();
        int rows = jdbc.sql("SELECT count(*) FROM users WHERE id = :user").param("user", account).query(Integer.class).single();
        for (String table : tables) {
            rows += jdbc.sql("SELECT count(*) FROM %s WHERE user_id = :user".formatted(table))
                    .param("user", account).query(Integer.class).single();
        }
        return rows;
    }

    private void verify() {
        assertThat(learner.post("/api/auth/verify-email", """
                {"token": "%s"}""".formatted(mails.onlyMailTo(email).token()))).hasStatus(HttpStatus.NO_CONTENT);
    }

    private int sessionsOf(UUID account) {
        return jdbc.sql("SELECT count(*) FROM spring_session WHERE principal_name = :account")
                .param("account", account.toString()).query(Integer.class).single();
    }

    private SpaClient signedIn(String password) {
        SpaClient device = new SpaClient(mvc);
        device.get("/api/auth/status");
        assertThat(device.post("/api/auth/login", login(password))).hasStatus(HttpStatus.NO_CONTENT);
        return device;
    }

    private String login(String password) {
        return """
                {"email": "%s", "password": "%s"}""".formatted(email, password);
    }
}
