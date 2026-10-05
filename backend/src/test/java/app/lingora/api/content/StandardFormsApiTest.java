package app.lingora.api.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.SpaClient;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** The Standard-form lexicon of the repository's content/gheg_blocklist.json, served to the app's pre-check. */
class StandardFormsApiTest extends IntegrationTest {

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
    void servesTheListedWordsWithTheirGhegForms() {
        MvcTestResult lexicon = learner.get("/api/content/standard-forms");

        assertThat(lexicon).hasStatusOk().bodyJson().extractingPath("$.words[?(@.standard == 'është')].gheg")
                .asArray().containsExactly(List.of("âsht"));
        assertThat(lexicon).bodyJson().extractingPath("$.words[?(@.standard == 'tani')].gheg")
                .asArray().containsExactly(List.of("tash", "tashti"));
    }

    @Test
    void servesThePatternsWithTypedReplacementsAndExceptions() {
        MvcTestResult lexicon = learner.get("/api/content/standard-forms");

        assertThat(lexicon).bodyJson().extractingPath("$.patterns[?(@.id == 'participle_uar')]").asArray().singleElement()
                .isEqualTo(Map.of("id", "participle_uar", "pattern", "uar(a|at|ave|e|i|in|it|ës|ën)?$",
                        "gheg", List.of(Map.of("kind", "suffix", "value", "ue"),
                                Map.of("kind", "suffix", "value", "uem")),
                        "exceptions", List.of("duar", "gëzuar")));
        assertThat(lexicon).bodyJson().extractingPath("$.patterns[?(@.id == 'house_shtepi')].gheg[0]").asArray()
                .containsExactly(Map.of("kind", "prefix", "value", "shpi"));
    }

    @Test
    void mayBeCachedPrivatelyForADay() {
        MvcTestResult lexicon = learner.get("/api/content/standard-forms");

        assertThat(lexicon).hasHeader(HttpHeaders.CACHE_CONTROL, "max-age=86400, private");
    }

    @Test
    void requiresASignedInLearner() {
        MvcTestResult anonymous = new SpaClient(mvc).get("/api/content/standard-forms");

        assertThat(anonymous).hasStatus(HttpStatus.UNAUTHORIZED)
                .hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
    }
}
