package app.lingora.api.profile;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.SpaClient;
import app.lingora.content.ContentFixture;
import app.lingora.content.ContentLoader;
import app.lingora.content.ContentSeeder;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Exports written by earlier Lingora versions stay importable (PRD 13). The files in {@code src/test/resources/exports}
 * were exported once by the version they are named after, from the content fixture, and must never be changed.
 */
class StoredExportImportTest extends IntegrationTest {

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;

    @BeforeEach
    void signedInLearnerWithSeededFixture() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(loader.load(ContentFixture.path()));
        learner = new SpaClient(mvc);
        learner.get("/api/auth/status");
        assertThat(learner.post("/api/auth/setup", """
                {"displayName": "Arta", "password": "shpija-e-madhe"}""")).hasStatus(HttpStatus.CREATED);
    }

    @Test
    void importsAnExportOfFormatVersion1() throws IOException {
        MvcTestResult imported = learner.upload("/api/profile/import", "file", stored("lingora-export-v1.zip"));

        assertThat(imported).hasStatusOk().bodyJson().extractingPath("$.schemaVersion").isEqualTo(1);
        assertThat(imported).bodyJson().extractingPath("$.imported").isEqualTo(Map.ofEntries(
                Map.entry("streaks", 1), Map.entry("fsrsParams", 1), Map.entry("learningPlans", 1),
                Map.entry("planChanges", 1), Map.entry("placementTests", 1), Map.entry("placementAnswers", 1),
                Map.entry("sessions", 1), Map.entry("badges", 0), Map.entry("attempts", 6), Map.entry("skillMastery", 2),
                Map.entry("srsCards", 1), Map.entry("reviewLog", 1)));
        assertThat(jdbc.sql("SELECT display_name || '|' || current_level || '|' || xp_total FROM users")
                .query(String.class).single()).isEqualTo("Erza|A1.2|15");
        assertThat(jdbc.sql("SELECT unit_id || '|' || (checkpoint_passed IS NULL) FROM sessions").query(String.class).single())
                .isEqualTo("a1_u01_greetings|true");
        assertThat(jdbc.sql("SELECT request_retention FROM review_log").query(Double.class).single()).isEqualTo(0.9);
        assertThat(learner.get("/api/profile/export")).hasStatusOk();
    }

    private static byte[] stored(String file) throws IOException {
        try (InputStream export = StoredExportImportTest.class.getResourceAsStream("/exports/" + file)) {
            assertThat(export).as(file).isNotNull();
            return export.readAllBytes();
        }
    }
}
