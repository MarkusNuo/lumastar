package app.lumastar.api.auth;

import static app.lumastar.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.MailCatcher.SentMail;
import app.lumastar.SpaClient;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Registration, sign-in and sign-out by e-mail address in the default open registration mode. */
class AuthApiTest extends IntegrationTest {

    private static final String STATUS = "/api/auth/status";
    private static final String REGISTER = "/api/auth/register";
    private static final String LOGIN = "/api/auth/login";
    private static final String LOGOUT = "/api/auth/logout";
    private static final String ME = "/api/me";
    private static final String PASSWORD = SpaClient.PASSWORD;

    private SpaClient browser;

    @BeforeEach
    void freshInstance() {
        jdbc.sql("DELETE FROM users").update();
        browser = new SpaClient(mvc);
    }

    @Nested
    class Status {

        @Test
        void offersTheOpenRegistrationToVisitorsAndIssuesTheCsrfCookie() {
            MvcTestResult status = browser.get(STATUS);

            assertThat(status).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                    {"authenticated": false, "registrationMode": "open", "legacyLoginAvailable": false}""");
            assertThat(browser.csrfToken()).isNotBlank();
            assertThat(SpaClient.setCookieHeaders(status, SpaClient.CSRF_COOKIE)).singleElement().asString()
                    .contains("Path=/")
                    .doesNotContain("HttpOnly");
        }

        @Test
        void namesTheSignedInLearnerAndWhetherTheAddressIsVerified() {
            browser.register("Erza");

            assertThat(browser.get(STATUS)).bodyJson().isStrictlyEqualTo("""
                    {"authenticated": true, "registrationMode": "open", "legacyLoginAvailable": false,
                     "displayName": "Erza", "emailVerified": false}""");
        }
    }

    @Nested
    class Registering {

        @Test
        void createsAnUnverifiedAccountAndSignsIn() {
            browser.get(STATUS);

            MvcTestResult registration = browser.post(REGISTER, """
                    {"email": "Erza@Example.com", "password": "%s", "displayName": " Erza "}"""
                    .formatted(PASSWORD));

            String profile = """
                    {"displayName": "Erza", "xpTotal": 0, "dailyGoalMinutes": 10, "onboardingCompleted": false,
                     "onboardingStep": "profile", "motivations": [], "email": "Erza@Example.com", "emailVerified": false,
                     "emailRequired": false}""";
            assertThat(registration).hasStatus(HttpStatus.CREATED).bodyJson().isStrictlyEqualTo(profile);
            assertThat(browser.sessionCookie()).isNotNull();
            assertThat(browser.get(ME)).hasStatusOk().bodyJson().isStrictlyEqualTo(profile);
            assertThat(jdbc.sql("SELECT email_verified_at IS NULL FROM users").query(Boolean.class).single()).isTrue();
        }

        @Test
        void indexesTheSessionByTheAccountSoThatItCanBeEndedLater() {
            browser.register("Erza");

            UUID account = jdbc.sql("SELECT id FROM users").query(UUID.class).single();
            assertThat(jdbc.sql("SELECT count(*) FROM spring_session WHERE principal_name = :account")
                    .param("account", account.toString()).query(Integer.class).single()).isOne();
        }

        @Test
        void sendsAVerificationMailWithASingleUseLinkStoredOnlyAsHash() {
            String email = browser.register("Erza");

            SentMail mail = mails.onlyMailTo(email);
            assertThat(mail.from()).isEqualTo("Lumastar <noreply@lumastar.local>");
            assertThat(mail.subject()).isEqualTo("Bitte bestätige deine E-Mail-Adresse");
            assertThat(mail.text()).startsWith("Hallo Erza\n\n")
                    .contains("http://localhost:5173/verify-email?token=" + mail.token(), "48 Stunden");
            assertThat(mail.html()).contains("href=\"http://localhost:5173/verify-email?token=" + mail.token() + "\"");
            assertThat(mail.token()).matches("[A-Za-z0-9_-]{43}");
            assertThat(jdbc.sql("SELECT purpose || '|' || email || '|' || (expires_at - created_at) FROM account_tokens")
                    .query(String.class).single()).isEqualTo("verify_email|" + email + "|2 days");
            assertThat(jdbc.sql("SELECT token_hash FROM account_tokens").query(String.class).single())
                    .matches("[0-9a-f]{64}")
                    .isNotEqualTo(mail.token());
        }

        @Test
        void storesOnlyAnArgon2idHashOfThePassword() {
            browser.register("Erza");

            assertThat(jdbc.sql("SELECT password_hash FROM users").query(String.class).single())
                    .startsWith("$argon2id$v=19$m=19456,t=2,p=1$")
                    .doesNotContain(PASSWORD);
        }

        @Test
        void rejectsAnAddressOfAnotherAccountRegardlessOfCase() {
            String taken = new SpaClient(mvc).register("Erza");
            browser.get(STATUS);

            MvcTestResult duplicate = browser.post(REGISTER, """
                    {"email": "%s", "password": "another-password", "displayName": "Mallory"}"""
                    .formatted(taken.toUpperCase()));

            assertProblem(duplicate, HttpStatus.CONFLICT, "email_taken");
            assertThat(jdbc.sql("SELECT display_name FROM users").query(String.class).list()).containsExactly("Erza");
            assertThat(browser.sessionCookie()).isNull();
        }

        @Test
        void validatesAddressPasswordAndDisplayName() {
            browser.get(STATUS);

            MvcTestResult invalid = browser.post(REGISTER, """
                    {"email": "erza@localhost", "password": "kurz", "displayName": " "}""");

            assertProblem(invalid, HttpStatus.BAD_REQUEST, "validation_failed");
            assertThat(invalid).bodyJson().extractingPath("$.errors[*].field").asArray()
                    .containsExactly("displayName", "email", "password");
            assertThat(browser.post(REGISTER, "{}")).hasStatus(HttpStatus.BAD_REQUEST);
        }

        @ParameterizedTest
        @ValueSource(strings = {"erza", "erza@", "@example.com", "e rza@example.com", "erza@example"})
        void rejectsMalformedAddresses(String email) {
            browser.get(STATUS);

            assertProblem(register(email, PASSWORD, "Erza"), HttpStatus.BAD_REQUEST, "validation_failed");
        }

        @Test
        void enforcesTheLengthLimits() {
            browser.get(STATUS);
            String longAddress = "e".repeat(243) + "@example.com";

            assertThat(longAddress).hasSize(255);
            assertProblem(register(longAddress, PASSWORD, "Erza"), HttpStatus.BAD_REQUEST, "validation_failed");
            assertProblem(register("erza@example.com", "p".repeat(129), "Erza"), HttpStatus.BAD_REQUEST, "validation_failed");
            assertProblem(register("erza@example.com", PASSWORD, "E".repeat(41)), HttpStatus.BAD_REQUEST, "validation_failed");
            assertProblem(register("erza@example.com", PASSWORD, "Erza\\nAdmin"), HttpStatus.BAD_REQUEST, "validation_failed");
            assertThat(register("erza@example.com", "p".repeat(128), "E".repeat(40))).hasStatus(HttpStatus.CREATED);
        }

        @Test
        void throttlesRegistrationsPerClientAddress() {
            browser.get(STATUS);
            for (int i = 0; i < 5; i++) {
                assertThat(register("throttled-%d@example.com".formatted(i), PASSWORD, "Erza")).hasStatus(HttpStatus.CREATED);
            }

            MvcTestResult throttled = register("throttled-5@example.com", PASSWORD, "Erza");

            assertProblem(throttled, HttpStatus.TOO_MANY_REQUESTS, "too_many_requests");
            assertThat(Integer.parseInt(throttled.getResponse().getHeader(HttpHeaders.RETRY_AFTER))).isBetween(3500, 3600);
            assertThat(throttled).bodyJson().extractingPath("$.retryAfterSeconds").asNumber().isNotNull();
            SpaClient otherAddress = new SpaClient(mvc);
            otherAddress.register("Arta");
        }

        @Test
        void succeedsEvenIfTheVerificationMailCannotBeSent() {
            mails.serverDown();
            try {
                String email = browser.register("Erza");

                assertThat(mails.sentTo(email)).isEmpty();
                assertThat(browser.get(ME)).hasStatusOk();
            } finally {
                mails.serverUp();
            }
        }

        @Test
        void rejectsARegistrationWithoutTheCsrfToken() {
            browser.get(STATUS);

            assertProblem(browser.postWithoutCsrfHeader(REGISTER, registration("erza@example.com", PASSWORD, "Erza")),
                    HttpStatus.FORBIDDEN, "csrf_invalid");
            assertProblem(browser.postWithCsrfHeader(REGISTER, registration("erza@example.com", PASSWORD, "Erza"),
                    "forged-token"), HttpStatus.FORBIDDEN, "csrf_invalid");
            assertThat(jdbc.sql("SELECT count(*) FROM users").query(Integer.class).single()).isZero();
        }

        private MvcTestResult register(String email, String password, String displayName) {
            return browser.post(REGISTER, registration(email, password, displayName));
        }
    }

    @Nested
    class SigningIn {

        private String email;

        @BeforeEach
        void registeredAndSignedOut() {
            SpaClient registration = new SpaClient(mvc);
            email = registration.register("Erza");
            browser.get(STATUS);
        }

        @Test
        void signsInByAddressRegardlessOfCaseWithANewSessionIdAndCsrfToken() {
            assertThat(browser.post(LOGIN, login(email, PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);
            String sessionBefore = browser.sessionCookie();
            String csrfBefore = browser.csrfToken();

            MvcTestResult login = browser.post(LOGIN, login(" " + email.toUpperCase() + " ", PASSWORD));

            assertThat(login).hasStatus(HttpStatus.NO_CONTENT);
            assertThat(browser.sessionCookie()).isNotNull().isNotEqualTo(sessionBefore);
            assertThat(browser.csrfToken()).isNotNull().isNotEqualTo(csrfBefore);
            assertThat(browser.get(ME)).hasStatusOk().bodyJson().extractingPath("$.displayName").isEqualTo("Erza");
            SpaClient withOldSession = new SpaClient(mvc);
            withOldSession.useSession(sessionBefore);
            assertProblem(withOldSession.get(ME), HttpStatus.UNAUTHORIZED, "authentication_required");
        }

        @Test
        void storesTheSessionInTheDatabase() {
            browser.post(LOGIN, login(email, PASSWORD));

            SpaClient sameBrowserLater = new SpaClient(mvc);
            sameBrowserLater.useSession(browser.sessionCookie());
            assertThat(sameBrowserLater.get(ME)).hasStatusOk();
        }

        @Test
        void rejectsAWrongPasswordAndAnUnknownAddressAlike() {
            MvcTestResult wrongPassword = browser.post(LOGIN, login(email, "shtëpia-e-madhe"));
            MvcTestResult unknownAddress = browser.post(LOGIN, login("nobody@example.com", PASSWORD));

            for (MvcTestResult rejected : new MvcTestResult[] {wrongPassword, unknownAddress}) {
                assertProblem(rejected, HttpStatus.UNAUTHORIZED, "invalid_credentials");
                assertThat(rejected).bodyJson().extractingPath("$.detail").isEqualTo("Wrong e-mail address or password.");
            }
            assertProblem(browser.get(ME), HttpStatus.UNAUTHORIZED, "authentication_required");
        }

        @Test
        void rejectsAPasswordOnlyLoginWhenNoAccountLacksAnAddress() {
            assertProblem(browser.post(LOGIN, """
                    {"password": "%s"}""".formatted(PASSWORD)), HttpStatus.UNAUTHORIZED, "invalid_credentials");
        }

        @Test
        void throttlesRepeatedFailedLoginsOfAClient() {
            for (int attempt = 0; attempt < LoginThrottle.FREE_ATTEMPTS; attempt++) {
                assertThat(browser.post(LOGIN, login(email, "wrong-" + attempt))).hasStatus(HttpStatus.UNAUTHORIZED);
            }

            MvcTestResult throttled = browser.post(LOGIN, login(email, PASSWORD));

            assertProblem(throttled, HttpStatus.TOO_MANY_REQUESTS, "login_throttled");
            assertThat(Integer.parseInt(throttled.getResponse().getHeader(HttpHeaders.RETRY_AFTER))).isBetween(1, 60);
            assertThat(new SpaClient(mvc).get(STATUS)).hasStatusOk();
        }

        @Test
        void capsFailedLoginsOnAnAddressAcrossClientsAlikeForAddressesWithoutAccount() {
            String unknown = "nobody-%s@example.com".formatted(UUID.randomUUID());
            for (String address : new String[] {email, unknown}) {
                for (int attempt = 0; attempt < LoginThrottle.ATTEMPTS_PER_EMAIL; attempt++) {
                    SpaClient attacker = new SpaClient(mvc);
                    attacker.get(STATUS);
                    assertProblem(attacker.post(LOGIN, login(address, "wrong-" + attempt)), HttpStatus.UNAUTHORIZED,
                            "invalid_credentials");
                }
            }

            MvcTestResult known = browser.post(LOGIN, login(email, PASSWORD));
            MvcTestResult withoutAccount = browser.post(LOGIN, login(unknown, PASSWORD));

            for (MvcTestResult throttled : new MvcTestResult[] {known, withoutAccount}) {
                assertProblem(throttled, HttpStatus.TOO_MANY_REQUESTS, "login_throttled");
                assertThat(throttled).bodyJson().extractingPath("$.detail")
                        .isEqualTo("Too many failed sign-in attempts; try again later.");
                assertThat(Integer.parseInt(throttled.getResponse().getHeader(HttpHeaders.RETRY_AFTER)))
                        .isBetween(1, (int) LoginThrottle.EMAIL_WINDOW.toSeconds());
            }
            SpaClient otherLearner = new SpaClient(mvc);
            String otherEmail = otherLearner.register("Arta");
            otherLearner.post(LOGOUT, "");
            assertThat(otherLearner.post(LOGIN, login(otherEmail, PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);
        }

        @Test
        void logoutEndsTheSessionAndIssuesAFreshCsrfToken() {
            browser.post(LOGIN, login(email, PASSWORD));
            String csrfWhileSignedIn = browser.csrfToken();

            assertThat(browser.post(LOGOUT, "")).hasStatus(HttpStatus.NO_CONTENT);

            assertThat(browser.csrfToken()).isNotNull().isNotEqualTo(csrfWhileSignedIn);
            assertProblem(browser.get(ME), HttpStatus.UNAUTHORIZED, "authentication_required");
            assertThat(browser.post(LOGIN, login(email, PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);
        }

        @Test
        void logoutRequiresASignedInSession() {
            assertProblem(browser.post(LOGOUT, ""), HttpStatus.UNAUTHORIZED, "authentication_required");
        }

        @Test
        void aSessionOfADeletedAccountCountsAsSignedOut() {
            browser.post(LOGIN, login(email, PASSWORD));
            jdbc.sql("DELETE FROM users").update();

            assertProblem(browser.get(ME), HttpStatus.UNAUTHORIZED, "authentication_required");
            assertThat(browser.get(STATUS)).bodyJson().extractingPath("$.authenticated").isEqualTo(false);
        }
    }

    @Test
    void answersUnauthenticatedApiCallsWithAProblemInsteadOfARedirect() {
        MvcTestResult me = browser.get(ME);

        assertProblem(me, HttpStatus.UNAUTHORIZED, "authentication_required");
        assertThat(me.getResponse().getHeader(HttpHeaders.LOCATION)).isNull();
        assertProblem(browser.get("/api/unknown"), HttpStatus.UNAUTHORIZED, "authentication_required");
        assertProblem(browser.get("/api/account"), HttpStatus.UNAUTHORIZED, "authentication_required");
    }

    @Test
    void theOldFirstStartSetupIsGone() {
        browser.get(STATUS);

        assertProblem(browser.post("/api/auth/setup", """
                {"displayName": "Erza", "password": "%s"}""".formatted(PASSWORD)), HttpStatus.UNAUTHORIZED,
                "authentication_required");
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
        assertProblem(browser.post(REGISTER, "{\"email\": "), HttpStatus.BAD_REQUEST, "bad_request");
        browser.register("Erza");

        assertProblem(browser.get("/api/unknown"), HttpStatus.NOT_FOUND, "not_found");
        assertProblem(browser.post(ME, "{}"), HttpStatus.METHOD_NOT_ALLOWED, "method_not_allowed");
    }

    private static String registration(String email, String password, String displayName) {
        return """
                {"email": "%s", "password": "%s", "displayName": "%s"}"""
                .formatted(email, password, displayName);
    }

    private static String login(String email, String password) {
        return """
                {"email": "%s", "password": "%s"}""".formatted(email, password);
    }
}
