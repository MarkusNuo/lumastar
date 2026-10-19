package app.lumastar.api.auth;

import static app.lumastar.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.MailCatcher.SentMail;
import app.lumastar.SpaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Verification of the sign-in address and its change by the single-use links of account mails (M8). */
class EmailVerificationApiTest extends IntegrationTest {

    private static final String VERIFY = "/api/auth/verify-email";
    private static final String RESEND = "/api/auth/verify-email/resend";
    private static final String CHANGE_EMAIL = "/api/account/email";
    private static final String ACCOUNT = "/api/account";

    private SpaClient learner;
    private String email;

    @BeforeEach
    void registeredLearner() {
        jdbc.sql("DELETE FROM users").update();
        learner = new SpaClient(mvc);
        email = learner.register("Erza");
    }

    @Nested
    class Verifying {

        @Test
        void theLinkVerifiesTheAddressWithoutSignIn() {
            SpaClient anotherDevice = new SpaClient(mvc);
            anotherDevice.get("/api/auth/status");

            assertThat(anotherDevice.post(VERIFY, token(mails.onlyMailTo(email)))).hasStatus(HttpStatus.NO_CONTENT);

            assertThat(learner.get(ACCOUNT)).hasStatusOk().bodyJson().extractingPath("$.emailVerified").isEqualTo(true);
            assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.emailVerified").isEqualTo(true);
            assertProblem(anotherDevice.get("/api/me"), HttpStatus.UNAUTHORIZED, "authentication_required");
        }

        @Test
        void aLinkWorksOnlyOnce() {
            String body = token(mails.onlyMailTo(email));
            assertThat(learner.post(VERIFY, body)).hasStatus(HttpStatus.NO_CONTENT);

            assertProblem(learner.post(VERIFY, body), HttpStatus.GONE, "token_invalid");
        }

        @Test
        void anExpiredLinkIsRejectedAsExpired() {
            String body = token(mails.onlyMailTo(email));
            jdbc.sql("UPDATE account_tokens SET created_at = now() - interval '49 hours', expires_at = now() - interval '1 hour'")
                    .update();

            assertProblem(learner.post(VERIFY, body), HttpStatus.GONE, "token_expired");
            assertProblem(learner.post(VERIFY, body), HttpStatus.GONE, "token_expired");
            assertThat(learner.get(ACCOUNT)).bodyJson().extractingPath("$.emailVerified").isEqualTo(false);
        }

        @Test
        void unknownAndMalformedTokensAreInvalid() {
            assertProblem(learner.post(VERIFY, """
                    {"token": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}"""), HttpStatus.GONE, "token_invalid");
            assertProblem(learner.post(VERIFY, """
                    {"token": "kein token"}"""), HttpStatus.GONE, "token_invalid");
            assertProblem(learner.post(VERIFY, "{}"), HttpStatus.BAD_REQUEST, "validation_failed");
        }

        @Test
        void aPasswordResetLinkDoesNotVerifyAndStaysUsable() {
            verify();
            SpaClient visitor = new SpaClient(mvc);
            visitor.get("/api/auth/status");
            visitor.post("/api/auth/password-reset", """
                    {"email": "%s"}""".formatted(email));
            SentMail reset = mails.lastMailTo(email);

            assertProblem(visitor.post(VERIFY, token(reset)), HttpStatus.GONE, "token_invalid");
            assertThat(visitor.post("/api/auth/password-reset/confirm", """
                    {"token": "%s", "newPassword": "ein-neues-passwort"}""".formatted(reset.token())))
                    .hasStatus(HttpStatus.NO_CONTENT);
        }

        @Test
        void aLinkForAnAddressTheAccountNoLongerHasIsInvalid() {
            String firstLink = token(mails.onlyMailTo(email));
            assertThat(learner.put(CHANGE_EMAIL, change("typo-fixed@example.com"))).hasStatusOk();

            assertProblem(learner.post(VERIFY, firstLink), HttpStatus.GONE, "token_invalid");
        }
    }

    @Nested
    class Resending {

        @Test
        void sendsANewLinkAndVoidsTheEarlierOne() {
            String firstLink = token(mails.onlyMailTo(email));

            assertThat(learner.post(RESEND, "")).hasStatus(HttpStatus.NO_CONTENT);

            String secondLink = token(mails.lastMailTo(email));
            assertThat(secondLink).isNotEqualTo(firstLink);
            assertProblem(learner.post(VERIFY, firstLink), HttpStatus.GONE, "token_invalid");
            assertThat(learner.post(VERIFY, secondLink)).hasStatus(HttpStatus.NO_CONTENT);
        }

        @Test
        void isThrottledPerAccount() {
            for (int i = 0; i < 5; i++) {
                assertThat(learner.post(RESEND, "")).hasStatus(HttpStatus.NO_CONTENT);
            }

            assertProblem(learner.post(RESEND, ""), HttpStatus.TOO_MANY_REQUESTS, "too_many_requests");
            assertThat(mails.sentTo(email)).hasSize(6);
        }

        @Test
        void refusesWhenTheAddressIsVerifiedAndNoChangeIsPending() {
            verify();

            assertProblem(learner.post(RESEND, ""), HttpStatus.CONFLICT, "email_already_verified");
        }

        @Test
        void resendsTheConfirmationOfAPendingChange() {
            verify();
            learner.put(CHANGE_EMAIL, change("new-address@example.com"));

            assertThat(learner.post(RESEND, "")).hasStatus(HttpStatus.NO_CONTENT);

            assertThat(mails.sentTo("new-address@example.com")).hasSize(2)
                    .allSatisfy(mail -> assertThat(mail.subject()).isEqualTo("Bestätige deine neue E-Mail-Adresse"));
        }

        @Test
        void requiresSignIn() {
            SpaClient visitor = new SpaClient(mvc);
            visitor.get("/api/auth/status");

            assertProblem(visitor.post(RESEND, ""), HttpStatus.UNAUTHORIZED, "authentication_required");
        }
    }

    @Nested
    class ChangingTheAddress {

        @Test
        void aVerifiedAddressStaysUntilTheNewOneIsConfirmed() {
            verify();

            MvcTestResult changed = learner.put(CHANGE_EMAIL, change("New@Example.com"));

            assertThat(changed).hasStatusOk().bodyJson().extractingPath("$.pendingEmail").isEqualTo("New@Example.com");
            assertThat(changed).bodyJson().extractingPath("$.email").isEqualTo(email);
            SentMail confirmation = mails.onlyMailTo("new@example.com");
            assertThat(confirmation.subject()).isEqualTo("Bestätige deine neue E-Mail-Adresse");
            assertThat(login(email)).hasStatus(HttpStatus.NO_CONTENT);

            assertThat(learner.post(VERIFY, token(confirmation))).hasStatus(HttpStatus.NO_CONTENT);

            MvcTestResult account = learner.get(ACCOUNT);
            assertThat(account).bodyJson().isLenientlyEqualTo("""
                    {"email": "New@Example.com", "emailVerified": true, "displayName": "Erza"}""");
            assertThat(account).bodyJson().doesNotHavePath("$.pendingEmail");
            assertThat(login("new@example.com")).hasStatus(HttpStatus.NO_CONTENT);
            assertProblem(login(email), HttpStatus.UNAUTHORIZED, "invalid_credentials");
        }

        @Test
        void theVerifiedAddressIsToldOfTheChangeAndHowToStopIt() {
            verify();

            learner.put(CHANGE_EMAIL, change("New@Example.com"));

            SentMail notice = mails.lastMailTo(email);
            assertThat(notice.subject()).isEqualTo("Deine E-Mail-Adresse soll geändert werden");
            assertThat(notice.text()).contains("New@Example.com", "Falls du das nicht warst").doesNotContain("token=");
        }

        @Test
        void aChangeEndsTheOtherSessionsOfTheAccount() {
            SpaClient otherDevice = new SpaClient(mvc);
            otherDevice.get("/api/auth/status");
            assertThat(otherDevice.post("/api/auth/login", """
                    {"email": "%s", "password": "%s"}""".formatted(email, SpaClient.PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);

            assertThat(learner.put(CHANGE_EMAIL, change("typo-fixed@example.com"))).hasStatusOk();

            assertThat(learner.get(ACCOUNT)).hasStatusOk();
            assertProblem(otherDevice.get(ACCOUNT), HttpStatus.UNAUTHORIZED, "authentication_required");
        }

        @Test
        void anUnverifiedAddressIsReplacedAtOnceAndGetsAVerificationLink() {
            MvcTestResult changed = learner.put(CHANGE_EMAIL, change("typo-fixed@example.com"));

            assertThat(mails.sentTo(email)).as("no notice to an unverified address").hasSize(1);

            assertThat(changed).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                    {"email": "typo-fixed@example.com", "emailVerified": false, "displayName": "Erza"}""");
            assertThat(changed).bodyJson().doesNotHavePath("$.pendingEmail");
            SentMail verification = mails.onlyMailTo("typo-fixed@example.com");
            assertThat(verification.subject()).isEqualTo("Bitte bestätige deine E-Mail-Adresse");
            assertThat(learner.post(VERIFY, token(verification))).hasStatus(HttpStatus.NO_CONTENT);
            assertThat(learner.get(ACCOUNT)).bodyJson().extractingPath("$.emailVerified").isEqualTo(true);
        }

        @Test
        void theCurrentAddressCancelsAPendingChange() {
            verify();
            learner.put(CHANGE_EMAIL, change("new-address@example.com"));
            String pendingLink = token(mails.onlyMailTo("new-address@example.com"));

            MvcTestResult cancelled = learner.put(CHANGE_EMAIL, change(email.toUpperCase()));

            assertThat(cancelled).hasStatusOk().bodyJson().extractingPath("$.email").isEqualTo(email);
            assertThat(cancelled).bodyJson().doesNotHavePath("$.pendingEmail");
            assertProblem(learner.post(VERIFY, pendingLink), HttpStatus.GONE, "token_invalid");
        }

        @Test
        void rejectsTheAddressOfAnotherAccountRegardlessOfCase() {
            String taken = new SpaClient(mvc).register("Arta");

            assertProblem(learner.put(CHANGE_EMAIL, change(taken.toUpperCase())), HttpStatus.CONFLICT, "email_taken");
            assertThat(mails.sentTo(taken)).hasSize(1);
        }

        @Test
        void aConfirmationFailsIfAnotherAccountTookTheAddressMeanwhile() {
            verify();
            learner.put(CHANGE_EMAIL, change("contested@example.com"));
            String link = token(mails.onlyMailTo("contested@example.com"));
            SpaClient rival = new SpaClient(mvc);
            rival.get("/api/auth/status");
            assertThat(rival.post("/api/auth/register", """
                    {"email": "contested@example.com", "password": "%s", "displayName": "Arta"}"""
                    .formatted(SpaClient.PASSWORD))).hasStatus(HttpStatus.CREATED);

            assertProblem(learner.post(VERIFY, link), HttpStatus.CONFLICT, "email_taken");
            assertThat(learner.get(ACCOUNT)).bodyJson().extractingPath("$.email").isEqualTo(email);
        }

        @Test
        void requiresTheCurrentPassword() {
            MvcTestResult refused = learner.put(CHANGE_EMAIL, """
                    {"newEmail": "new-address@example.com", "password": "falsch-falsch"}""");

            assertProblem(refused, HttpStatus.FORBIDDEN, "invalid_password");
            assertThat(mails.sentTo("new-address@example.com")).isEmpty();
            assertThat(learner.get(ACCOUNT)).bodyJson().extractingPath("$.email").isEqualTo(email);
        }

        @Test
        void validatesTheNewAddress() {
            MvcTestResult invalid = learner.put(CHANGE_EMAIL, """
                    {"newEmail": "keine-adresse", "password": "%s"}""".formatted(SpaClient.PASSWORD));

            assertProblem(invalid, HttpStatus.BAD_REQUEST, "validation_failed");
            assertThat(invalid).bodyJson().extractingPath("$.errors[*].field").asArray().containsExactly("newEmail");
        }
    }

    private void verify() {
        assertThat(learner.post(VERIFY, token(mails.onlyMailTo(email)))).hasStatus(HttpStatus.NO_CONTENT);
    }

    private MvcTestResult login(String address) {
        SpaClient browser = new SpaClient(mvc);
        browser.get("/api/auth/status");
        return browser.post("/api/auth/login", """
                {"email": "%s", "password": "%s"}""".formatted(address, SpaClient.PASSWORD));
    }

    private static String token(SentMail mail) {
        return """
                {"token": "%s"}""".formatted(mail.token());
    }

    private static String change(String newEmail) {
        return """
                {"newEmail": "%s", "password": "%s"}""".formatted(newEmail, SpaClient.PASSWORD);
    }
}
