package app.lingora.api.auth;

import static app.lingora.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.MailCatcher.SentMail;
import app.lingora.SpaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** "Passwort vergessen" by a single-use link that only verified addresses get (M8, DECISIONS #78). */
class PasswordResetApiTest extends IntegrationTest {

    private static final String RESET = "/api/auth/password-reset";
    private static final String CONFIRM = "/api/auth/password-reset/confirm";
    private static final String NEW_PASSWORD = "ein-neues-passwort";

    private SpaClient learner;
    private String email;
    private SpaClient visitor;

    @BeforeEach
    void verifiedLearnerAndAVisitorWhoForgotThePassword() {
        jdbc.sql("DELETE FROM users").update();
        learner = new SpaClient(mvc);
        email = learner.register("Erza");
        assertThat(learner.post("/api/auth/verify-email", """
                {"token": "%s"}""".formatted(mails.onlyMailTo(email).token()))).hasStatus(HttpStatus.NO_CONTENT);
        visitor = new SpaClient(mvc);
        visitor.get("/api/auth/status");
    }

    @Test
    void mailsALinkToAVerifiedAddress() {
        MvcTestResult requested = visitor.post(RESET, request(email.toUpperCase()));

        assertThat(requested).hasStatus(HttpStatus.ACCEPTED);
        SentMail mail = mails.lastMailTo(email);
        assertThat(mail.subject()).isEqualTo("Neues Passwort für Lingora");
        assertThat(mail.text()).contains("http://localhost:5173/reset-password?token=" + mail.token(), "1 Stunde");
        assertThat(jdbc.sql("SELECT expires_at - created_at FROM account_tokens WHERE purpose = 'reset_password'")
                .query(String.class).single()).isEqualTo("01:00:00");
    }

    @Test
    void answersTheSameForUnknownAndUnverifiedAddressesButSendsNothing() {
        SpaClient unverified = new SpaClient(mvc);
        String unverifiedEmail = unverified.register("Arta");

        assertThat(visitor.post(RESET, request("nobody@example.com"))).hasStatus(HttpStatus.ACCEPTED);
        assertThat(visitor.post(RESET, request(unverifiedEmail))).hasStatus(HttpStatus.ACCEPTED);

        assertThat(mails.sentTo("nobody@example.com")).isEmpty();
        assertThat(mails.sentTo(unverifiedEmail)).hasSize(1);
        assertThat(jdbc.sql("SELECT count(*) FROM account_tokens WHERE purpose = 'reset_password'").query(Integer.class)
                .single()).isZero();
    }

    @Test
    void theLinkSetsTheNewPasswordAndEndsAllSessionsOfTheAccount() {
        SpaClient secondDevice = new SpaClient(mvc);
        secondDevice.get("/api/auth/status");
        secondDevice.post("/api/auth/login", login(SpaClient.PASSWORD));
        visitor.post(RESET, request(email));

        assertThat(visitor.post(CONFIRM, confirm(mails.lastMailTo(email).token(), NEW_PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);

        assertProblem(learner.get("/api/me"), HttpStatus.UNAUTHORIZED, "authentication_required");
        assertProblem(secondDevice.get("/api/me"), HttpStatus.UNAUTHORIZED, "authentication_required");
        assertProblem(visitor.get("/api/me"), HttpStatus.UNAUTHORIZED, "authentication_required");
        assertProblem(visitor.post("/api/auth/login", login(SpaClient.PASSWORD)), HttpStatus.UNAUTHORIZED, "invalid_credentials");
        assertThat(visitor.post("/api/auth/login", login(NEW_PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void aLinkWorksOnlyOnce() {
        visitor.post(RESET, request(email));
        String token = mails.lastMailTo(email).token();
        assertThat(visitor.post(CONFIRM, confirm(token, NEW_PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);

        assertProblem(visitor.post(CONFIRM, confirm(token, "noch-ein-passwort")), HttpStatus.GONE, "token_invalid");
        assertThat(visitor.post("/api/auth/login", login(NEW_PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void aLinkExpiresAfterOneHour() {
        visitor.post(RESET, request(email));
        jdbc.sql("""
                UPDATE account_tokens SET created_at = now() - interval '61 minutes', expires_at = now() - interval '1 minute'
                WHERE purpose = 'reset_password'""").update();

        assertProblem(visitor.post(CONFIRM, confirm(mails.lastMailTo(email).token(), NEW_PASSWORD)), HttpStatus.GONE,
                "token_expired");
        assertThat(learner.get("/api/me")).hasStatusOk();
    }

    @Test
    void aNewRequestVoidsTheEarlierLink() {
        visitor.post(RESET, request(email));
        String first = mails.lastMailTo(email).token();
        visitor.post(RESET, request(email));

        assertProblem(visitor.post(CONFIRM, confirm(first, NEW_PASSWORD)), HttpStatus.GONE, "token_invalid");
        assertThat(visitor.post(CONFIRM, confirm(mails.lastMailTo(email).token(), NEW_PASSWORD)))
                .hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void aVerificationLinkCannotResetThePassword() {
        SpaClient newcomer = new SpaClient(mvc);
        String newcomerEmail = newcomer.register("Arta");

        assertProblem(visitor.post(CONFIRM, confirm(mails.onlyMailTo(newcomerEmail).token(), NEW_PASSWORD)),
                HttpStatus.GONE, "token_invalid");
        assertThat(newcomer.post("/api/auth/verify-email", """
                {"token": "%s"}""".formatted(mails.onlyMailTo(newcomerEmail).token()))).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void aLinkStopsWorkingWhenThePasswordIsChangedOrTheAddressMoves() {
        visitor.post(RESET, request(email));
        String beforeChange = mails.lastMailTo(email).token();
        assertThat(learner.put("/api/account/password", """
                {"currentPassword": "%s", "newPassword": "%s"}""".formatted(SpaClient.PASSWORD, NEW_PASSWORD)))
                .hasStatus(HttpStatus.NO_CONTENT);
        assertProblem(visitor.post(CONFIRM, confirm(beforeChange, "noch-ein-passwort")), HttpStatus.GONE, "token_invalid");

        visitor.post(RESET, request(email));
        String beforeMove = mails.lastMailTo(email).token();
        learner.put("/api/account/email", """
                {"newEmail": "moved@example.com", "password": "%s"}""".formatted(NEW_PASSWORD));
        learner.post("/api/auth/verify-email", """
                {"token": "%s"}""".formatted(mails.lastMailTo("moved@example.com").token()));

        assertProblem(visitor.post(CONFIRM, confirm(beforeMove, "noch-ein-passwort")), HttpStatus.GONE, "token_invalid");
    }

    @Test
    void validatesTheNewPassword() {
        visitor.post(RESET, request(email));

        MvcTestResult tooShort = visitor.post(CONFIRM, confirm(mails.lastMailTo(email).token(), "kurz"));

        assertProblem(tooShort, HttpStatus.BAD_REQUEST, "validation_failed");
        assertThat(tooShort).bodyJson().extractingPath("$.errors[*].field").asArray().containsExactly("newPassword");
        assertProblem(visitor.post(RESET, request("keine-adresse")), HttpStatus.BAD_REQUEST, "validation_failed");
    }

    @Test
    void throttlesRequestsPerAddressAcrossClients() {
        for (int i = 0; i < 3; i++) {
            SpaClient client = new SpaClient(mvc);
            client.get("/api/auth/status");
            assertThat(client.post(RESET, request(email))).hasStatus(HttpStatus.ACCEPTED);
        }

        assertProblem(visitor.post(RESET, request(email.toUpperCase())), HttpStatus.TOO_MANY_REQUESTS, "too_many_requests");
        assertThat(mails.sentTo(email)).hasSize(4);
    }

    @Test
    void throttlesRequestsPerClient() {
        for (int i = 0; i < 10; i++) {
            assertThat(visitor.post(RESET, request("someone-%d@example.com".formatted(i)))).hasStatus(HttpStatus.ACCEPTED);
        }

        assertProblem(visitor.post(RESET, request(email)), HttpStatus.TOO_MANY_REQUESTS, "too_many_requests");
    }

    private String login(String password) {
        return """
                {"email": "%s", "password": "%s"}""".formatted(email, password);
    }

    private static String request(String address) {
        return """
                {"email": "%s"}""".formatted(address);
    }

    private static String confirm(String token, String newPassword) {
        return """
                {"token": "%s", "newPassword": "%s"}""".formatted(token, newPassword);
    }
}
