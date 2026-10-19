package app.lumastar.api;

import static app.lumastar.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.ClockedIntegrationTest;
import app.lumastar.LessonDriver;
import app.lumastar.PlacementDriver;
import app.lumastar.PushSubscriptions;
import app.lumastar.SpaClient;
import app.lumastar.SyntheticContent;
import app.lumastar.content.ContentSeeder;
import app.lumastar.export.ZipFiles;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/**
 * Strict per-learner isolation: whatever one learner does, through every endpoint, never shows in or changes the
 * data of another. The clock stands still, so that every view of a learner can be compared before and after.
 */
class TwoLearnerIsolationTest extends ClockedIntegrationTest {

    /** Every GET endpoint with learner data; global content endpoints are left out. */
    private static final List<String> VIEWS = List.of("/api/me", "/api/account", "/api/settings", "/api/path", "/api/plan",
            "/api/plan/changes", "/api/progress/today", "/api/stats", "/api/badges", "/api/review/summary",
            "/api/profile/summary", "/api/profile/documents/learner_profile.json",
            "/api/profile/documents/skill_mastery.json", "/api/profile/documents/recent_errors.json",
            "/api/profile/documents/learning_plan.json", "/api/reminders", "/api/push/subscriptions",
            "/api/streak");

    @Autowired
    private ContentSeeder seeder;

    private SpaClient arta;
    private SpaClient bora;
    private UUID artaId;
    private UUID boraId;

    @BeforeEach
    void twoLearnersWithSyntheticContent() {
        clock.set(MONDAY_MORNING);
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(SyntheticContent.bundle());
        arta = new SpaClient(mvc);
        artaId = accountId(arta.register("Arta"));
        bora = new SpaClient(mvc);
        boraId = accountId(bora.register("Bora"));
    }

    @Test
    void whatOneLearnerDoesNeverChangesTheViewsOfTheOther() {
        Map<String, String> boraBefore = views(bora);
        learn(arta);
        assertThat(views(bora)).isEqualTo(boraBefore);

        Map<String, String> artaBefore = views(arta);
        learn(bora);
        assertThat(bora.put("/api/account/display-name", """
                {"displayName": "Bora B."}""")).hasStatusOk();
        assertThat(bora.put("/api/account/password", """
                {"currentPassword": "%s", "newPassword": "ein-neues-passwort"}""".formatted(SpaClient.PASSWORD)))
                .hasStatus(HttpStatus.NO_CONTENT);

        assertThat(views(arta)).isEqualTo(artaBefore);
    }

    @Test
    void aLearnerCannotAnswerOrCompleteTheLessonOfAnother() {
        learn(arta);
        learn(bora);
        JsonNode openLesson = new LessonDriver(arta).start(LessonDriver.A0_WORDS);
        String lesson = openLesson.get("sessionId").asString();
        String exercise = openLesson.get("exercises").get(0).get("id").asString();

        assertProblem(bora.post("/api/lessons/%s/attempts".formatted(lesson), """
                {"exerciseId": "%s", "answer": {"choice": "ja"}, "responseTimeMs": 2000}""".formatted(exercise)),
                HttpStatus.NOT_FOUND, "lesson_not_found");
        assertProblem(bora.post("/api/lessons/%s/complete".formatted(lesson), ""), HttpStatus.NOT_FOUND, "lesson_not_found");

        assertThat(jdbc.sql("SELECT count(*) FROM attempts WHERE session_id = CAST(:lesson AS uuid)").param("lesson", lesson)
                .query(Integer.class).single()).isZero();
        new LessonDriver(arta).answerAll(openLesson, "ja");
        new LessonDriver(arta).complete(openLesson);
    }

    @Test
    void aLearnerCannotAnswerOrReadThePlacementTestOfAnother() {
        learn(arta);
        learn(bora);
        String skipped = jdbc.sql("SELECT id::text FROM placement_tests WHERE user_id = :user AND status = 'skipped'")
                .param("user", artaId).query(String.class).single();
        JsonNode open = new PlacementDriver(arta, jdbc).start();
        String openTest = open.get("testId").asString();
        String pendingItem = open.get("item").get("id").asString();

        assertProblem(bora.get("/api/placement/%s/result".formatted(skipped)), HttpStatus.NOT_FOUND, "placement_not_found");
        assertProblem(bora.post("/api/placement/%s/answers".formatted(openTest), """
                {"exerciseId": "%s", "answer": {"choice": "ja"}, "responseTimeMs": 2000}""".formatted(pendingItem)),
                HttpStatus.NOT_FOUND, "placement_not_found");

        assertThat(arta.get("/api/placement/%s/result".formatted(skipped))).hasStatusOk();
        assertThat(jdbc.sql("SELECT count(*) FROM placement_answers WHERE placement_test_id = CAST(:test AS uuid)")
                .param("test", openTest).query(Integer.class).single()).isZero();
        assertThat(jdbc.sql("SELECT status FROM placement_tests WHERE id = CAST(:test AS uuid)").param("test", openTest)
                .query(String.class).single()).isEqualTo("in_progress");
    }

    @Test
    void theExportOfALearnerHoldsNothingOfAnother() {
        learn(arta);
        learn(bora);

        String boraExport = String.join("\n", ZipFiles.unzip(export(bora)).values());

        List<String> artaRows = rowIdsOf(artaId);
        assertThat(artaRows).hasSizeGreaterThan(10);
        assertThat(boraExport).doesNotContain(artaRows.toArray(String[]::new))
                .doesNotContain(artaId.toString(), "Arta", accountEmail(artaId));
        assertThat(boraExport).contains("Bora");
    }

    @Test
    void importingIntoALearnerNeverTouchesAnother() {
        learn(arta);
        learn(bora);
        Map<String, String> artaBefore = views(arta);
        Map<String, String> artaExport = exportData(arta);

        assertThat(bora.upload("/api/profile/import", "file", export(arta))).hasStatusOk();
        assertThat(bora.upload("/api/profile/import", "file", export(bora))).hasStatusOk();

        assertThat(exportData(arta)).isEqualTo(artaExport);
        assertThat(views(arta)).isEqualTo(artaBefore);
        assertThat(rowIdsOf(boraId)).hasSameSizeAs(rowIdsOf(artaId)).doesNotContainAnyElementsOf(rowIdsOf(artaId));
        assertThat(bora.get("/api/me")).bodyJson().extractingPath("$.displayName").isEqualTo("Arta");
        assertThat(bora.get("/api/account")).bodyJson().extractingPath("$.email").isEqualTo(accountEmail(boraId));
    }

    @Test
    void deletingALearnerEmptiesEveryLearnerTableAndLeavesAnotherIntact() {
        learn(arta);
        learn(bora);
        assertThat(bora.upload("/api/profile/import", "file", export(arta))).hasStatusOk();
        Map<String, String> artaBefore = views(arta);
        Map<String, String> artaExport = exportData(arta);

        Map<String, Integer> boraRows = rowsPerTable(boraId);
        assertThat(List.of("sessions", "attempts", "skill_mastery", "learning_plans", "account_tokens",
                "push_subscriptions", "reminder_settings", "streak_goals"))
                .allSatisfy(table -> assertThat(boraRows.get(table)).as("rows of the learner in %s", table).isPositive());

        assertThat(bora.delete("/api/account", """
                {"password": "%s"}""".formatted(SpaClient.PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(rowsPerTable(boraId)).isNotEmpty().allSatisfy((table, rows) -> assertThat(rows)
                .as("rows of the deleted learner in %s", table).isZero());
        assertThat(exportData(arta)).isEqualTo(artaExport);
        assertThat(views(arta)).isEqualTo(artaBefore);
        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Integer.class).single()).isOne();
    }

    /**
     * Placement skip, a correct and a failed lesson (errors, focus suggestion, plan change), changed settings, a chosen
     * streak goal, and reminders on a device of the learner.
     */
    private void learn(SpaClient learner) {
        new PlacementDriver(learner, jdbc).answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
        LessonDriver lessons = new LessonDriver(learner);
        lessons.play(LessonDriver.A0_WORDS, "ja");
        lessons.play(LessonDriver.A0_WORDS, "nein");
        assertThat(learner.put("/api/settings", """
                {"dailyGoalMinutes": 20, "requestRetention": 0.85, "timeZone": "Europe/Berlin"}""")).hasStatusOk();
        assertThat(learner.put("/api/streak/goal", """
                {"target": 30}""")).hasStatusOk();
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(
                "https://fcm.googleapis.com/fcm/send/" + UUID.randomUUID()))).hasStatusOk();
        assertThat(learner.put("/api/reminders", """
                {"enabled": true, "time": "18:00", "rescueEnabled": true, "rescueTime": "21:00"}""")).hasStatusOk();
    }

    /** Status and body of every view of the learner. */
    private Map<String, String> views(SpaClient learner) {
        Map<String, String> views = new LinkedHashMap<>();
        for (String view : VIEWS) {
            MvcTestResult result = learner.get(view);
            views.put(view, result.getResponse().getStatus() + " " + body(result));
        }
        views.put("/api/profile/export", exportData(learner).toString());
        return views;
    }

    /** The files of the export, without the manifest with its export time. */
    private Map<String, String> exportData(SpaClient learner) {
        Map<String, String> entries = new LinkedHashMap<>(ZipFiles.unzip(export(learner)));
        entries.remove("manifest.json");
        return entries;
    }

    private static byte[] export(SpaClient learner) {
        MvcTestResult export = learner.get("/api/profile/export");
        assertThat(export).hasStatusOk();
        return export.getResponse().getContentAsByteArray();
    }

    /** The ids of all rows of the learner in every table with learner data. */
    private List<String> rowIdsOf(UUID learner) {
        return tablesWithUserId().stream()
                .filter(table -> !table.equals("account_tokens"))
                .flatMap(table -> jdbc.sql("SELECT id::text FROM %s WHERE user_id = :user".formatted(table))
                        .param("user", learner).query(String.class).list().stream())
                .toList();
    }

    /** The learner's rows in every table with a user_id column, as information_schema lists them. */
    private Map<String, Integer> rowsPerTable(UUID learner) {
        Map<String, Integer> rows = new LinkedHashMap<>();
        for (String table : tablesWithUserId()) {
            rows.put(table, jdbc.sql("SELECT count(*) FROM %s WHERE user_id = :user".formatted(table))
                    .param("user", learner).query(Integer.class).single());
        }
        return rows;
    }

    private List<String> tablesWithUserId() {
        return jdbc.sql("""
                        SELECT table_name FROM information_schema.columns
                        WHERE table_schema = current_schema() AND column_name = 'user_id' ORDER BY table_name""")
                .query(String.class).list();
    }

    private UUID accountId(String email) {
        return jdbc.sql("SELECT id FROM users WHERE email = :email").param("email", email).query(UUID.class).single();
    }

    private String accountEmail(UUID account) {
        return jdbc.sql("SELECT email FROM users WHERE id = :id").param("id", account).query(String.class).single();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
