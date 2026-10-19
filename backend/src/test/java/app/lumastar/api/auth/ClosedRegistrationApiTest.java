package app.lumastar.api.auth;

import static app.lumastar.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.SpaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

/** Registration closed by LUMASTAR_REGISTRATION_MODE=closed: nobody can sign up, existing accounts keep working. */
@TestPropertySource(properties = "lumastar.registration.mode=closed")
class ClosedRegistrationApiTest extends IntegrationTest {

    @Autowired
    private PasswordEncoder encoder;

    private SpaClient visitor;

    @BeforeEach
    void visitor() {
        jdbc.sql("DELETE FROM users").update();
        visitor = new SpaClient(mvc);
    }

    @Test
    void theStatusSaysThatRegistrationIsClosed() {
        assertThat(visitor.get("/api/auth/status")).bodyJson().extractingPath("$.registrationMode").isEqualTo("closed");
    }

    @Test
    void refusesEveryRegistrationEvenWithAnInviteCode() {
        visitor.get("/api/auth/status");

        assertProblem(visitor.post("/api/auth/register", """
                {"email": "erza@example.com", "password": "%s", "displayName": "Erza", "inviteCode": "mirë-se-vjen"}"""
                .formatted(SpaClient.PASSWORD)), HttpStatus.FORBIDDEN, "registration_closed");

        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Integer.class).single()).isZero();
        assertThat(mails.sentTo("erza@example.com")).isEmpty();
        assertProblem(visitor.get("/api/me"), HttpStatus.UNAUTHORIZED, "authentication_required");
    }

    @Test
    void existingAccountsStillSignIn() {
        jdbc.sql("INSERT INTO users (display_name, password_hash, email) VALUES ('Arta', :hash, 'arta@example.com')")
                .param("hash", encoder.encode(SpaClient.PASSWORD)).update();
        visitor.get("/api/auth/status");

        assertThat(visitor.post("/api/auth/login", """
                {"email": "arta@example.com", "password": "%s"}""".formatted(SpaClient.PASSWORD)))
                .hasStatus(HttpStatus.NO_CONTENT);
        assertThat(visitor.get("/api/me")).hasStatusOk().bodyJson().extractingPath("$.displayName").isEqualTo("Arta");
    }
}
