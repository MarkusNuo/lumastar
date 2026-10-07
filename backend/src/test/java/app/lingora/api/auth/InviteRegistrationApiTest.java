package app.lingora.api.auth;

import static app.lingora.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.SpaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Registration in invite mode, as configured by LINGORA_REGISTRATION_MODE and LINGORA_REGISTRATION_INVITE_CODE. */
@TestPropertySource(properties = {"lingora.registration.mode=invite", "lingora.registration.invite-code=mirë-se-vjen"})
class InviteRegistrationApiTest extends IntegrationTest {

    private SpaClient visitor;

    @BeforeEach
    void visitor() {
        jdbc.sql("DELETE FROM users").update();
        visitor = new SpaClient(mvc);
    }

    @Test
    void theStatusAsksForAnInviteCode() {
        assertThat(visitor.get("/api/auth/status")).bodyJson().extractingPath("$.registrationMode").isEqualTo("invite");
    }

    @Test
    void registersWithTheInviteCode() {
        visitor.get("/api/auth/status");

        assertThat(register("\"mirë-se-vjen\"")).hasStatus(HttpStatus.CREATED);
        assertThat(visitor.get("/api/me")).hasStatusOk();
    }

    @Test
    void rejectsAMissingOrWrongInviteCode() {
        visitor.get("/api/auth/status");

        assertProblem(register("null"), HttpStatus.FORBIDDEN, "invite_code_invalid");
        assertProblem(register("\"mire-se-vjen\""), HttpStatus.FORBIDDEN, "invite_code_invalid");
        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Integer.class).single()).isZero();
    }

    @Test
    void guessingTheInviteCodeIsThrottled() {
        visitor.get("/api/auth/status");
        for (int guess = 0; guess < 5; guess++) {
            assertProblem(register("\"guess-%d\"".formatted(guess)), HttpStatus.FORBIDDEN, "invite_code_invalid");
        }

        assertProblem(register("\"mirë-se-vjen\""), HttpStatus.TOO_MANY_REQUESTS, "too_many_requests");
    }

    private MvcTestResult register(String inviteCode) {
        return visitor.post("/api/auth/register", """
                {"email": "erza@example.com", "password": "%s", "displayName": "Erza", "inviteCode": %s}"""
                .formatted(SpaClient.PASSWORD, inviteCode));
    }
}
