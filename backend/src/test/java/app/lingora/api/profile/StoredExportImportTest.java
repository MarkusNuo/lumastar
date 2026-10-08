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
        learner.register("Arta");
    }

    @Test
    void importsAnExportOfFormatVersion1() throws IOException {
        MvcTestResult imported = learner.upload("/api/profile/import", "file", stored("lingora-export-v1.zip"));

        assertThat(imported).hasStatusOk().bodyJson().extractingPath("$.schemaVersion").isEqualTo(1);
        assertThat(imported).bodyJson().extractingPath("$.imported").isEqualTo(Map.ofEntries(
                Map.entry("streaks", 1), Map.entry("streakGoals", 0), Map.entry("fsrsParams", 1),
                Map.entry("learningPlans", 1), Map.entry("planChanges", 1), Map.entry("placementTests", 1),
                Map.entry("placementAnswers", 1), Map.entry("sessions", 1), Map.entry("badges", 0),
                Map.entry("streakDays", 0), Map.entry("attempts", 6), Map.entry("skillMastery", 2),
                Map.entry("srsCards", 1), Map.entry("reviewLog", 1)));
        assertThat(jdbc.sql("SELECT display_name || '|' || current_level || '|' || xp_total FROM users")
                .query(String.class).single()).isEqualTo("Erza|A1.2|15");
        assertThat(jdbc.sql("SELECT unit_id || '|' || (checkpoint_passed IS NULL) FROM sessions").query(String.class).single())
                .isEqualTo("a1_u01_greetings|true");
        assertThat(jdbc.sql("SELECT request_retention FROM review_log").query(Double.class).single()).isEqualTo(0.9);
        assertThat(learner.get("/api/profile/export")).hasStatusOk();
    }

    @Test
    void importsAnExportOfFormatVersion2() throws IOException {
        MvcTestResult imported = learner.upload("/api/profile/import", "file", stored("lingora-export-v2.zip"));

        assertThat(imported).hasStatusOk().bodyJson().extractingPath("$.schemaVersion").isEqualTo(2);
        assertThat(imported).bodyJson().extractingPath("$.imported").isEqualTo(Map.ofEntries(
                Map.entry("streaks", 1), Map.entry("streakGoals", 0), Map.entry("fsrsParams", 0),
                Map.entry("learningPlans", 1), Map.entry("planChanges", 1), Map.entry("placementTests", 0),
                Map.entry("placementAnswers", 0), Map.entry("sessions", 1), Map.entry("badges", 1),
                Map.entry("streakDays", 0), Map.entry("attempts", 6), Map.entry("skillMastery", 2),
                Map.entry("srsCards", 6), Map.entry("reviewLog", 11)));
        assertThat(jdbc.sql("""
                        SELECT current_days || '|' || longest_days || '|' || last_active_date || '|' || freezes_available
                               || '|' || freezes_refilled_on
                        FROM streaks""").query(String.class).single()).isEqualTo("4|9|2026-10-04|0|2026-09-28");
        assertThat(learner.get("/api/settings")).bodyJson().extractingPath("$.requestRetention").isEqualTo(0.85);
        assertThat(learner.get("/api/profile/export")).hasStatusOk();
    }

    @Test
    void importsAnExportOfFormatVersion3() throws IOException {
        MvcTestResult imported = learner.upload("/api/profile/import", "file", stored("lingora-export-v3.zip"));

        assertThat(imported).hasStatusOk().bodyJson().extractingPath("$.schemaVersion").isEqualTo(3);
        assertThat(imported).bodyJson().extractingPath("$.imported").isEqualTo(Map.ofEntries(
                Map.entry("streaks", 1), Map.entry("streakGoals", 0), Map.entry("fsrsParams", 1),
                Map.entry("learningPlans", 1), Map.entry("planChanges", 1), Map.entry("placementTests", 1),
                Map.entry("placementAnswers", 1), Map.entry("sessions", 1), Map.entry("badges", 0),
                Map.entry("streakDays", 3), Map.entry("attempts", 6), Map.entry("skillMastery", 2),
                Map.entry("srsCards", 6), Map.entry("reviewLog", 11)));
        assertThat(jdbc.sql("""
                        SELECT string_agg(day || ':' || kind || ':' || (session_id IS NOT NULL) || ':'
                                          || (placement_test_id IS NOT NULL), ',' ORDER BY day)
                        FROM streak_days""").query(String.class).single())
                .isEqualTo("2026-10-03:goal_met:false:false,2026-10-04:freeze:false:false,2026-10-05:goal_met:true:false");
        assertThat(learner.get("/api/profile/export")).hasStatusOk();
    }

    @Test
    void importsAnExportOfFormatVersion4WithTheFirstStreakGoal() throws IOException {
        MvcTestResult imported = learner.upload("/api/profile/import", "file", stored("lingora-export-v4.zip"));

        assertThat(imported).hasStatusOk().bodyJson().extractingPath("$.schemaVersion").isEqualTo(4);
        assertThat(imported).bodyJson().extractingPath("$.imported").isEqualTo(Map.ofEntries(
                Map.entry("streaks", 1), Map.entry("streakGoals", 0), Map.entry("fsrsParams", 1),
                Map.entry("learningPlans", 1), Map.entry("planChanges", 1), Map.entry("placementTests", 1),
                Map.entry("placementAnswers", 1), Map.entry("sessions", 1), Map.entry("badges", 0),
                Map.entry("streakDays", 3), Map.entry("attempts", 6), Map.entry("skillMastery", 2),
                Map.entry("srsCards", 6), Map.entry("reviewLog", 11)));
        assertThat(jdbc.sql("""
                        SELECT string_agg(day || ':' || kind || ':' || (session_id IS NOT NULL) || ':'
                                          || (placement_test_id IS NOT NULL), ',' ORDER BY day)
                        FROM streak_days""").query(String.class).single())
                .isEqualTo("2026-10-03:goal_met:false:true,2026-10-04:freeze:false:false,2026-10-05:goal_met:true:false");
        assertThat(learner.get("/api/streak")).hasStatusOk().bodyJson().extractingPath("$.goal.target").isEqualTo(10);
        assertThat(learner.get("/api/profile/export")).hasStatusOk();
    }

    private static byte[] stored(String file) throws IOException {
        try (InputStream export = StoredExportImportTest.class.getResourceAsStream("/exports/" + file)) {
            assertThat(export).as(file).isNotNull();
            return export.readAllBytes();
        }
    }
}
