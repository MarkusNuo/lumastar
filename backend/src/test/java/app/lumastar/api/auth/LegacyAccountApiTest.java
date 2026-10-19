package app.lumastar.api.auth;

import static app.lumastar.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.LearnerFixture;
import app.lumastar.SpaClient;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The account created before e-mail sign-in has no e-mail address: it signs in with its password only until it adds
 * one, and keeps its learning data.
 */
class LegacyAccountApiTest extends IntegrationTest {

    private static final String PASSWORD = "shpija-e-vjeter";

    @Autowired
    private PasswordEncoder passwordEncoder;

    private UUID legacyAccount;
    private SpaClient owner;

    @BeforeEach
    void accountFromBeforeMultiUserSupportWithLearningData() {
        jdbc.sql("DELETE FROM users").update();
        legacyAccount = jdbc.sql("""
                        INSERT INTO users (display_name, password_hash, xp_total, created_at)
                        VALUES ('Erza', :hash, 120, '2026-09-25T08:00:00Z') RETURNING id""")
                .param("hash", passwordEncoder.encode(PASSWORD))
                .query(UUID.class)
                .single();
        new LearnerFixture(jdbc).lesson(legacyAccount, null, Instant.parse("2026-09-26T08:00:00Z"));
        owner = new SpaClient(mvc);
        owner.get("/api/auth/status");
    }

    @Test
    void theStatusOffersThePasswordOnlyLogin() {
        assertThat(owner.get("/api/auth/status")).bodyJson().extractingPath("$.legacyLoginAvailable").isEqualTo(true);
    }

    @Test
    void signsInWithThePasswordAloneAndIsAskedForAnAddress() {
        assertThat(owner.post("/api/auth/login", legacyLogin(PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);

        MvcTestResult me = owner.get("/api/me");
        assertThat(me).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"displayName": "Erza", "xpTotal": 120, "emailVerified": false, "emailRequired": true}""");
        assertThat(me).bodyJson().doesNotHavePath("$.email");
        assertThat(owner.get("/api/account")).bodyJson().doesNotHavePath("$.email");
        assertProblem(owner.post("/api/auth/verify-email/resend", ""), HttpStatus.CONFLICT, "email_required");
    }

    @Test
    void rejectsAWrongPassword() {
        assertProblem(owner.post("/api/auth/login", legacyLogin("falsch-falsch")), HttpStatus.UNAUTHORIZED,
                "invalid_credentials");
    }

    @Test
    void addingAnAddressKeepsTheLearningDataAndEndsThePasswordOnlyLogin() {
        owner.post("/api/auth/login", legacyLogin(PASSWORD));

        MvcTestResult added = owner.put("/api/account/email", """
                {"newEmail": "erza@example.com", "password": "%s"}""".formatted(PASSWORD));

        assertThat(added).hasStatusOk().bodyJson().isLenientlyEqualTo("""
                {"email": "erza@example.com", "emailVerified": false, "displayName": "Erza"}""");
        assertThat(mails.onlyMailTo("erza@example.com").subject()).isEqualTo("Bitte bestätige deine E-Mail-Adresse");
        assertThat(owner.get("/api/me")).bodyJson().isLenientlyEqualTo("""
                {"email": "erza@example.com", "emailRequired": false, "xpTotal": 120}""");
        assertThat(jdbc.sql("SELECT count(*) FROM sessions WHERE user_id = :user").param("user", legacyAccount)
                .query(Integer.class).single()).isOne();
        assertThat(owner.get("/api/auth/status")).bodyJson().extractingPath("$.legacyLoginAvailable").isEqualTo(false);
        SpaClient laterBrowser = new SpaClient(mvc);
        laterBrowser.get("/api/auth/status");
        assertProblem(laterBrowser.post("/api/auth/login", legacyLogin(PASSWORD)), HttpStatus.UNAUTHORIZED,
                "invalid_credentials");
        assertThat(laterBrowser.post("/api/auth/login", """
                {"email": "erza@example.com", "password": "%s"}""".formatted(PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(jdbc.sql("SELECT id FROM users").query(UUID.class).single()).isEqualTo(legacyAccount);
    }

    @Test
    void addingAnAddressNeedsThePasswordAndAFreeAddress() {
        owner.post("/api/auth/login", legacyLogin(PASSWORD));
        String taken = new SpaClient(mvc).register("Arta");

        assertProblem(owner.put("/api/account/email", """
                {"newEmail": "erza@example.com", "password": "falsch-falsch"}"""), HttpStatus.FORBIDDEN, "invalid_password");
        assertProblem(owner.put("/api/account/email", """
                {"newEmail": "%s", "password": "%s"}""".formatted(taken, PASSWORD)), HttpStatus.CONFLICT, "email_taken");
        assertThat(owner.get("/api/me")).bodyJson().extractingPath("$.emailRequired").isEqualTo(true);
    }

    @Test
    void registeredAccountsDoNotOpenThePasswordOnlyLoginToOthers() {
        SpaClient newcomer = new SpaClient(mvc);
        newcomer.register("Arta");
        newcomer.post("/api/auth/logout", "");

        assertProblem(newcomer.post("/api/auth/login", legacyLogin(SpaClient.PASSWORD)), HttpStatus.UNAUTHORIZED,
                "invalid_credentials");
    }

    private static String legacyLogin(String password) {
        return """
                {"password": "%s"}""".formatted(password);
    }
}
