package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.SpaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

class AuthApiTest extends IntegrationTest {

    private static final String STATUS = "/api/auth/status";
    private static final String SETUP = "/api/auth/setup";
    private static final String LOGIN = "/api/auth/login";
    private static final String LOGOUT = "/api/auth/logout";
    private static final String ME = "/api/me";
    private static final String PASSWORD = "shpija-e-madhe";
    private static final String SETUP_BODY = """
            {"displayName": "Erza", "password": "%s"}""".formatted(PASSWORD);
    private static final String LOGIN_BODY = """
            {"password": "%s"}""".formatted(PASSWORD);

    private SpaClient browser;

    @BeforeEach
    void freshInstance() {
        jdbc.sql("DELETE FROM users").update();
        browser = new SpaClient(mvc);
    }

    @Test
    void freshInstanceAsksForSetupAndIssuesTheCsrfCookie() {
        MvcTestResult status = browser.get(STATUS);

        assertThat(status).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"setupRequired": true, "authenticated": false}""");
        assertThat(browser.csrfToken()).isNotBlank();
        assertThat(SpaClient.setCookieHeaders(status, SpaClient.CSRF_COOKIE)).singleElement().asString()
                .contains("Path=/")
                .doesNotContain("HttpOnly");
    }

    @Test
    void setupCreatesTheOnlyAccountAndSignsIn() {
        browser.get(STATUS);

        MvcTestResult setup = browser.post(SETUP, SETUP_BODY);

        assertThat(setup).hasStatus(HttpStatus.CREATED).bodyJson().isStrictlyEqualTo("""
                {"displayName": "Erza", "xpTotal": 0, "dailyGoalMinutes": 10, "onboardingCompleted": false}""");
        assertThat(browser.get(ME)).hasStatusOk().bodyJson().extractingPath("$.displayName").isEqualTo("Erza");
        assertThat(browser.get(STATUS)).bodyJson().isStrictlyEqualTo("""
                {"setupRequired": false, "authenticated": true, "displayName": "Erza"}""");
    }

    @Test
    void storesOnlyAnArgon2idHashOfThePassword() {
        setUpAccount();

        assertThat(jdbc.sql("SELECT password_hash FROM users").query(String.class).single())
                .startsWith("$argon2id$v=19$m=19456,t=2,p=1$")
                .doesNotContain(PASSWORD);
    }

    @Test
    void rejectsASecondSetup() {
        setUpAccount();
        SpaClient intruder = new SpaClient(mvc);
        intruder.get(STATUS);

        MvcTestResult secondSetup = intruder.post(SETUP, """
                {"displayName": "Mallory", "password": "an-other-password"}""");

        assertProblem(secondSetup, HttpStatus.CONFLICT, "account_exists");
        assertThat(jdbc.sql("SELECT display_name FROM users").query(String.class).list()).containsExactly("Erza");
    }

    @Test
    void validatesDisplayNameAndPassword() {
        browser.get(STATUS);

        MvcTestResult invalid = browser.post(SETUP, """
                {"displayName": " ", "password": "kurz"}""");

        assertProblem(invalid, HttpStatus.BAD_REQUEST, "validation_failed");
        assertThat(invalid).bodyJson().extractingPath("$.errors[*].field").asArray().containsExactly("displayName", "password");
        assertThat(browser.post(SETUP, """
                {"displayName": "%s", "password": "%s"}""".formatted("E".repeat(41), PASSWORD))).hasStatus(HttpStatus.BAD_REQUEST);
        assertThat(browser.post(SETUP, "{}")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsUnsafeRequestsWithoutAValidCsrfToken() {
        browser.get(STATUS);

        assertProblem(browser.postWithoutCsrfHeader(SETUP, SETUP_BODY), HttpStatus.FORBIDDEN, "csrf_invalid");
        assertProblem(browser.postWithCsrfHeader(SETUP, SETUP_BODY, "forged-token"), HttpStatus.FORBIDDEN, "csrf_invalid");
        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Integer.class).single()).isZero();
    }

    @Test
    void answersUnauthenticatedApiCallsWithAProblemInsteadOfARedirect() {
        MvcTestResult me = browser.get(ME);

        assertProblem(me, HttpStatus.UNAUTHORIZED, "authentication_required");
        assertThat(me.getResponse().getHeader(HttpHeaders.LOCATION)).isNull();
        assertProblem(browser.get("/api/unknown"), HttpStatus.UNAUTHORIZED, "authentication_required");
    }

    @Test
    void loginSignsInWithANewSessionIdAndCsrfToken() {
        setUpAccount();
        browser.get(STATUS);
        browser.openSession();
        String sessionBefore = browser.sessionId();
        String csrfBefore = browser.csrfToken();

        MvcTestResult login = browser.post(LOGIN, LOGIN_BODY);

        assertThat(login).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(browser.sessionId()).isNotNull().isNotEqualTo(sessionBefore);
        assertThat(browser.csrfToken()).isNotNull().isNotEqualTo(csrfBefore);
        assertThat(browser.get(ME)).hasStatusOk();
        assertThat(browser.post(LOGOUT, "")).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void rejectsAWrongPassword() {
        setUpAccount();
        browser.get(STATUS);

        assertProblem(browser.post(LOGIN, """
                {"password": "shtëpia-e-madhe"}"""), HttpStatus.UNAUTHORIZED, "invalid_credentials");
        assertProblem(browser.get(ME), HttpStatus.UNAUTHORIZED, "authentication_required");
    }

    @Test
    void rejectsALoginBeforeSetup() {
        browser.get(STATUS);

        assertProblem(browser.post(LOGIN, LOGIN_BODY), HttpStatus.UNAUTHORIZED, "invalid_credentials");
    }

    @Test
    void throttlesRepeatedFailedLogins() {
        setUpAccount();
        browser.get(STATUS);
        for (int attempt = 0; attempt < LoginThrottle.FREE_ATTEMPTS; attempt++) {
            assertThat(browser.post(LOGIN, """
                    {"password": "wrong-%d"}""".formatted(attempt))).hasStatus(HttpStatus.UNAUTHORIZED);
        }

        MvcTestResult throttled = browser.post(LOGIN, LOGIN_BODY);

        assertProblem(throttled, HttpStatus.TOO_MANY_REQUESTS, "login_throttled");
        assertThat(Integer.parseInt(throttled.getResponse().getHeader(HttpHeaders.RETRY_AFTER))).isBetween(1, 60);
        assertThat(new SpaClient(mvc).get(STATUS)).hasStatusOk();
    }

    @Test
    void logoutEndsTheSessionAndIssuesAFreshCsrfToken() {
        browser.get(STATUS);
        browser.post(SETUP, SETUP_BODY);
        String csrfWhileSignedIn = browser.csrfToken();

        assertThat(browser.post(LOGOUT, "")).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(browser.csrfToken()).isNotNull().isNotEqualTo(csrfWhileSignedIn);
        assertProblem(browser.get(ME), HttpStatus.UNAUTHORIZED, "authentication_required");
        assertThat(browser.post(LOGIN, LOGIN_BODY)).hasStatus(HttpStatus.NO_CONTENT);
    }

    @Test
    void logoutRequiresASignedInSession() {
        browser.get(STATUS);

        assertProblem(browser.post(LOGOUT, ""), HttpStatus.UNAUTHORIZED, "authentication_required");
    }

    @Test
    void leavesHealthAndApiDocumentationPublic() {
        assertThat(browser.get("/actuator/health")).hasStatusOk().bodyJson().extractingPath("$.status").isEqualTo("UP");
        assertThat(browser.get("/v3/api-docs")).hasStatusOk();
        assertThat(browser.get("/swagger-ui/index.html")).hasStatusOk();
    }

    @Test
    void rendersFrameworkErrorsAsProblemsWithACode() {
        browser.get(STATUS);
        assertProblem(browser.post(SETUP, "{\"displayName\": "), HttpStatus.BAD_REQUEST, "bad_request");
        browser.post(SETUP, SETUP_BODY);

        assertProblem(browser.get("/api/unknown"), HttpStatus.NOT_FOUND, "not_found");
        assertProblem(browser.post(ME, "{}"), HttpStatus.METHOD_NOT_ALLOWED, "method_not_allowed");
    }

    private void setUpAccount() {
        SpaClient owner = new SpaClient(mvc);
        owner.get(STATUS);
        assertThat(owner.post(SETUP, SETUP_BODY)).hasStatus(HttpStatus.CREATED);
    }

    private static void assertProblem(MvcTestResult result, HttpStatus status, String code) {
        assertThat(result).hasStatus(status).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
        assertThat(result).bodyJson().extractingPath("$.status").isEqualTo(status.value());
        assertThat(result).bodyJson().extractingPath("$.title").isEqualTo(status.getReasonPhrase());
    }
}
