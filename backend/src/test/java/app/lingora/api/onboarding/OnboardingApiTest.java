package app.lingora.api.onboarding;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.SpaClient;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

class OnboardingApiTest extends IntegrationTest {

    private SpaClient learner;

    @BeforeEach
    void signedInLearner() {
        jdbc.sql("DELETE FROM users").update();
        learner = new SpaClient(mvc);
        learner.get("/api/auth/status");
        assertThat(learner.post("/api/auth/setup", """
                {"displayName": "Erza", "password": "shpija-e-madhe"}""")).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void aNewAccountStartsWithTheProfileQuestions() {
        assertThat(learner.get("/api/me")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"displayName": "Erza", "xpTotal": 0, "dailyGoalMinutes": 10, "onboardingCompleted": false,
                 "onboardingStep": "profile", "motivations": []}""");
    }

    @Test
    void savesTheAnswersAndTellsWhereThePlacementTestStarts() {
        MvcTestResult answered = learner.put("/api/onboarding", """
                {"motivations": ["travel", "family"], "dailyGoalMinutes": 15, "selfAssessment": "simple_sentences"}""");

        assertThat(answered).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"startLevel": "A1.3", "placementSkippable": false}""");
        assertThat(learner.get("/api/me")).bodyJson().isStrictlyEqualTo("""
                {"displayName": "Erza", "xpTotal": 0, "dailyGoalMinutes": 15, "onboardingCompleted": false,
                 "onboardingStep": "placement", "motivations": ["family", "travel"], "selfAssessment": "simple_sentences"}""");
        assertThat(jdbc.sql("SELECT array_to_string(motivations, ',') || '|' || self_assessment FROM users")
                .query(String.class).single()).isEqualTo("family,travel|simple_sentences");
    }

    @Test
    void anAbsoluteBeginnerMaySkipThePlacementTest() {
        assertThat(learner.put("/api/onboarding", """
                {"motivations": ["heritage"], "dailyGoalMinutes": 5, "selfAssessment": "nothing"}"""))
                .hasStatusOk().bodyJson().isStrictlyEqualTo("""
                        {"startLevel": "A0", "placementSkippable": true}""");
    }

    @Test
    void theAnswersCanBeChangedAgain() {
        learner.put("/api/onboarding", """
                {"motivations": ["work"], "dailyGoalMinutes": 10, "selfAssessment": "few_words"}""");

        assertThat(learner.put("/api/onboarding", """
                {"motivations": ["interest"], "dailyGoalMinutes": 20, "selfAssessment": "understand_much"}"""))
                .hasStatusOk().bodyJson().isStrictlyEqualTo("""
                        {"startLevel": "B1.2", "placementSkippable": false}""");
        assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.dailyGoalMinutes").isEqualTo(20);
    }

    @Test
    void offersTheOptionsWithGermanLabels() {
        MvcTestResult options = learner.get("/api/onboarding/options");

        assertThat(options).hasStatusOk().bodyJson().extractingPath("$.dailyGoalMinutes").isEqualTo(List.of(5, 10, 15, 20));
        assertThat(options).bodyJson().extractingPath("$.motivations[0]")
                .isEqualTo(Map.of("value", "family", "label", "Familie/Partner"));
        assertThat(options).bodyJson().extractingPath("$.selfAssessments").isEqualTo(List.of(
                Map.of("value", "nothing", "label", "Ich kann kein Wort", "startLevel", "A0", "placementSkippable", true),
                Map.of("value", "few_words", "label", "Ich kenne ein paar Wörter", "startLevel", "A1.1",
                        "placementSkippable", false),
                Map.of("value", "simple_sentences", "label", "Ich kann einfache Sätze bilden", "startLevel", "A1.3",
                        "placementSkippable", false),
                Map.of("value", "everyday_conversation", "label", "Ich kann mich im Alltag unterhalten", "startLevel", "A2.2",
                        "placementSkippable", false),
                Map.of("value", "understand_much", "label", "Ich verstehe viel, will aber besser schreiben",
                        "startLevel", "B1.2", "placementSkippable", false)));
    }

    @Test
    void rejectsInvalidAnswers() {
        assertValidationError("""
                {"motivations": [], "dailyGoalMinutes": 10, "selfAssessment": "nothing"}""", "motivations");
        assertValidationError("""
                {"motivations": ["family", "family"], "dailyGoalMinutes": 10, "selfAssessment": "nothing"}""",
                "motivationsDistinct");
        assertValidationError("""
                {"motivations": ["family"], "dailyGoalMinutes": 7, "selfAssessment": "nothing"}""", "dailyGoalMinutesAllowed");
        assertValidationError("""
                {"motivations": ["family"], "dailyGoalMinutes": 10}""", "selfAssessment");
        assertThat(learner.put("/api/onboarding", """
                {"motivations": ["money"], "dailyGoalMinutes": 10, "selfAssessment": "nothing"}"""))
                .hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.code").isEqualTo("bad_request");
        assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.onboardingStep").isEqualTo("profile");
    }

    @Test
    void requiresSignInAndTheCsrfToken() {
        String body = """
                {"motivations": ["family"], "dailyGoalMinutes": 10, "selfAssessment": "nothing"}""";

        assertThat(learner.putWithoutCsrfHeader("/api/onboarding", body)).hasStatus(HttpStatus.FORBIDDEN)
                .bodyJson().extractingPath("$.code").isEqualTo("csrf_invalid");
        SpaClient stranger = new SpaClient(mvc);
        stranger.get("/api/auth/status");
        assertThat(stranger.put("/api/onboarding", body)).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(stranger.get("/api/onboarding/options")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private void assertValidationError(String body, String field) {
        MvcTestResult result = learner.put("/api/onboarding", body);
        assertThat(result).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.code").isEqualTo("validation_failed");
        assertThat(result).bodyJson().extractingPath("$.errors[*].field").asArray().contains(field);
    }
}
