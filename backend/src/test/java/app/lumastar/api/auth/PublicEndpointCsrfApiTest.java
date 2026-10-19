package app.lumastar.api.auth;

import static app.lumastar.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.SpaClient;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The public account endpoints need the CSRF token like every unsafe call (SPA cookie pattern): a request without the
 * {@code X-XSRF-TOKEN} header or with a forged one is refused before it has any effect.
 */
class PublicEndpointCsrfApiTest extends IntegrationTest {

    private static final String LOGIN = "/api/auth/login";
    private static final String VERIFY = "/api/auth/verify-email";
    private static final String RESET = "/api/auth/password-reset";
    private static final String CONFIRM = "/api/auth/password-reset/confirm";
    private static final String NEW_PASSWORD = "ein-neues-passwort";

    private String email;
    private String verificationLink;
    private SpaClient browser;

    @BeforeEach
    void registeredLearnerAndABrowserWithTheCsrfCookie() {
        jdbc.sql("DELETE FROM users").update();
        email = new SpaClient(mvc).register("Erza");
        verificationLink = mails.onlyMailTo(email).token();
        browser = new SpaClient(mvc);
        browser.get("/api/auth/status");
    }

    @Test
    void signingInNeedsTheToken() {
        String credentials = """
                {"email": "%s", "password": "%s"}""".formatted(email, SpaClient.PASSWORD);

        assertRefused(forged(LOGIN, credentials));

        assertProblem(browser.get("/api/me"), HttpStatus.UNAUTHORIZED, "authentication_required");
        assertThat(browser.post(LOGIN, credentials)).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void verifyingAnAddressNeedsTheToken() {
        assertRefused(forged(VERIFY, token(verificationLink)));

        assertThat(emailVerified()).isFalse();
        assertThat(browser.post(VERIFY, token(verificationLink))).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(emailVerified()).isTrue();
    }

    @Test
    void requestingAPasswordResetNeedsTheToken() {
        browser.post(VERIFY, token(verificationLink));
        String request = """
                {"email": "%s"}""".formatted(email);

        assertRefused(forged(RESET, request));

        assertThat(mails.sentTo(email)).hasSize(1);
        assertThat(browser.post(RESET, request)).hasStatus(HttpStatus.ACCEPTED);
        assertThat(mails.sentTo(email)).hasSize(2);
    }

    @Test
    void confirmingAPasswordResetNeedsTheToken() {
        browser.post(VERIFY, token(verificationLink));
        browser.post(RESET, """
                {"email": "%s"}""".formatted(email));
        String confirmation = """
                {"token": "%s", "newPassword": "%s"}""".formatted(mails.lastMailTo(email).token(), NEW_PASSWORD);

        assertRefused(forged(CONFIRM, confirmation));

        assertThat(browser.post(CONFIRM, confirmation)).as("the link is still unused").hasStatus(HttpStatus.NO_CONTENT);
    }

    private List<MvcTestResult> forged(String uri, String json) {
        return List.of(browser.postWithoutCsrfHeader(uri, json), browser.postWithCsrfHeader(uri, json, "forged-token"));
    }

    private static void assertRefused(List<MvcTestResult> requests) {
        for (MvcTestResult request : requests) {
            assertProblem(request, HttpStatus.FORBIDDEN, "csrf_invalid");
        }
    }

    private boolean emailVerified() {
        return jdbc.sql("SELECT email_verified_at IS NOT NULL FROM users").query(Boolean.class).single();
    }

    private static String token(String link) {
        return """
                {"token": "%s"}""".formatted(link);
    }
}
