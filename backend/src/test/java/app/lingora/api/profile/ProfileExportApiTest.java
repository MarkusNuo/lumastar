package app.lingora.api.profile;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
import app.lingora.SpaClient;
import app.lingora.content.ContentFixture;
import app.lingora.content.ContentLoader;
import app.lingora.content.ContentSeeder;
import app.lingora.export.ZipFiles;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** ZIP export and import of the complete learning state (PRD F11, 13) against the content fixture. */
class ProfileExportApiTest extends IntegrationTest {

    private static final String EXPORT = "/api/profile/export";
    private static final String IMPORT = "/api/profile/import";
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final List<String> DATA_FILES = List.of("data/profile.json", "data/streaks.json",
            "data/streak_goals.json", "data/fsrs_params.json", "data/learning_plans.json", "data/plan_changes.json",
            "data/placement_tests.json", "data/placement_answers.json", "data/sessions.json", "data/badges.json",
            "data/streak_days.json", "data/attempts.json", "data/skill_mastery.json", "data/srs_cards.json",
            "data/review_log.json");
    private static final Map<String, String> CORRECT_GREETINGS_ANSWERS = Map.of(
            "ex_a1_u01_001", """
                    {"choice": "Mirëdita"}""",
            "ex_a1_u01_002", """
                    {"text": "si je"}""",
            "ex_a1_u01_003", """
                    {"tokens": ["Guten", "Tag", "wie", "geht", "es", "dir"]}""",
            "ex_a1_u01_004", """
                    {"mistakes": 0}""",
            "ex_a1_u01_005", """
                    {"tokens": ["Mirëdita", "si", "je"]}""");

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;
    private String learnerEmail;
    private UUID learnerId;

    @BeforeEach
    void learnerWithARichLearningState() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(loader.load(ContentFixture.path()));
        learner = new SpaClient(mvc);
        learnerEmail = learner.register("Erza");
        learnerId = jdbc.sql("SELECT id FROM users").query(UUID.class).single();
        playGreetingsLessonWithOneRetry();
        addPlacementPlanAndReviewData();
    }

    @Nested
    class Exporting {

        @Test
        void downloadsAZipWithManifestDocumentsAndData() {
            MvcTestResult export = learner.get(EXPORT);

            assertThat(export).hasStatusOk().hasContentType(MediaType.parseMediaType("application/zip"));
            assertThat(export.getResponse().getHeader(HttpHeaders.CONTENT_DISPOSITION)).isEqualTo(
                    "attachment; filename=\"lingora-export-%s.zip\"".formatted(LocalDate.now(ZoneId.of("Europe/Zurich"))));
            Map<String, String> entries = ZipFiles.unzip(export.getResponse().getContentAsByteArray());
            assertThat(entries.keySet()).containsExactlyElementsOf(concat(List.of("manifest.json",
                    "documents/learner_profile.json", "documents/skill_mastery.json", "documents/recent_errors.json",
                    "documents/learning_plan.json", "documents/learner_summary.md"), DATA_FILES));
            assertThat(entries.get("documents/learner_profile.json"))
                    .isEqualTo(text(learner.get("/api/profile/documents/learner_profile.json")));
        }

        @Test
        void describesTheContentInTheManifest() {
            JsonNode manifest = JSON.readTree(entries(export()).get("manifest.json"));

            assertThat(manifest.get("schemaVersion").asInt()).isEqualTo(5);
            assertThat(manifest.get("appVersion").asString()).isEqualTo("0.1.0-SNAPSHOT");
            assertThat(manifest.get("exportedAt").asString()).endsWith("Z");
            assertThat(manifest.get("counts")).isEqualTo(JSON.readTree("""
                    {"streaks": 1, "streakGoals": 1, "fsrsParams": 1, "learningPlans": 1, "planChanges": 1,
                     "placementTests": 1, "placementAnswers": 1, "sessions": 1, "badges": 0, "streakDays": 0, "attempts": 6,
                     "skillMastery": 2, "srsCards": 6, "reviewLog": 11}"""));
        }

        @Test
        void containsTheCompleteLearnerDataButNeverTheAccountIdentity() {
            Map<String, String> entries = entries(export());

            assertThat(JSON.readTree(entries.get("data/profile.json"))).isEqualTo(JSON.readTree("""
                    {"displayName": "Erza", "motivations": ["family", "travel"], "dailyGoalMinutes": 10,
                     "selfAssessment": "few_words", "currentLevel": "A1.2", "xpTotal": 15, "timeZone": "Europe/Zurich",
                     "settings": {"sounds": true, "requestRetention": 0.9},
                     "onboardingCompletedAt": "2026-09-20T08:00:00+00:00"}"""));
            JsonNode attempt = JSON.readTree(entries.get("data/attempts.json")).get(0);
            assertThat(attempt.propertyNames()).containsExactly("id", "sessionId", "position", "exerciseId",
                    "exerciseType", "skillTags", "isRetry", "answer", "outcome", "errorCategory", "fsrsRating", "responseMs",
                    "evaluatedBy", "answeredAt", "expected");
            assertThat(String.join("\n", entries.values())).doesNotContain("argon2", "passwordHash", "password_hash",
                    learnerId.toString(), learnerEmail);
        }

        @Test
        void requiresASignedInLearner() {
            assertThat(new SpaClient(mvc).get(EXPORT)).hasStatus(HttpStatus.UNAUTHORIZED)
                    .bodyJson().extractingPath("$.code").isEqualTo("authentication_required");
        }
    }

    @Nested
    class Importing {

        @Test
        void anExportImportsBackLosslessly() {
            byte[] first = export();

            MvcTestResult imported = learner.upload(IMPORT, "file", first);
            byte[] second = export();

            assertThat(imported).hasStatusOk();
            Map<String, String> before = entries(first);
            JsonNode manifest = JSON.readTree(before.get("manifest.json"));
            assertThat(imported).bodyJson().isStrictlyEqualTo("""
                    {"schemaVersion": 5, "exportedAt": "%s", "imported": %s}"""
                    .formatted(manifest.get("exportedAt").asString(), manifest.get("counts")));
            Map<String, String> after = entries(second);
            assertThat(withoutManifest(after)).isEqualTo(withoutManifest(before));
            assertThat(withoutExportTime(after.get("manifest.json"))).isEqualTo(withoutExportTime(before.get("manifest.json")));
        }

        @Test
        void replacesLaterProgressAndKeepsTheAccountAndItsSession() {
            byte[] backup = export();
            String passwordHash = passwordHash();
            playGreetingsLessonWithOneRetry();
            jdbc.sql("UPDATE users SET display_name = 'Renamed'").update();

            assertThat(learner.upload(IMPORT, "file", backup)).hasStatusOk();

            assertThat(count("sessions")).isOne();
            assertThat(jdbc.sql("SELECT id || '|' || display_name || '|' || xp_total FROM users").query(String.class).single())
                    .isEqualTo(learnerId + "|Erza|15");
            assertThat(passwordHash()).isEqualTo(passwordHash);
            assertThat(learner.get("/api/me")).hasStatusOk().bodyJson().extractingPath("$.displayName").isEqualTo("Erza");
            SpaClient anotherBrowser = new SpaClient(mvc);
            anotherBrowser.get("/api/auth/status");
            assertThat(anotherBrowser.post("/api/auth/login", """
                    {"email": "%s", "password": "%s"}""".formatted(learnerEmail, SpaClient.PASSWORD)))
                    .hasStatus(HttpStatus.NO_CONTENT);
        }

        @Test
        void restoresTheLearningStateIntoAnotherAccount() {
            byte[] backup = export();
            jdbc.sql("DELETE FROM users").update();
            SpaClient newInstance = new SpaClient(mvc);
            newInstance.register("Arta");
            UUID newAccount = jdbc.sql("SELECT id FROM users").query(UUID.class).single();

            assertThat(newInstance.upload(IMPORT, "file", backup)).hasStatusOk();

            assertThat(jdbc.sql("SELECT DISTINCT user_id FROM attempts").query(UUID.class).list()).containsExactly(newAccount);
            Map<String, String> restored = entries(newInstance.get(EXPORT).getResponse().getContentAsByteArray());
            DATA_FILES.forEach(file -> assertThat(restored.get(file)).as(file).isEqualTo(entries(backup).get(file)));
        }

        @Test
        void requiresSignInAndTheCsrfToken() {
            byte[] backup = export();
            SpaClient stranger = new SpaClient(mvc);
            stranger.get("/api/auth/status");

            assertProblem(stranger.upload(IMPORT, "file", backup), HttpStatus.UNAUTHORIZED, "authentication_required");
            assertProblem(learner.uploadWithoutCsrfHeader(IMPORT, "file", backup), HttpStatus.FORBIDDEN, "csrf_invalid");
        }
    }

    @Nested
    class InvalidFiles {

        @Test
        void rejectsAFileWithoutManifest() {
            assertProblem(learner.upload(IMPORT, "file", "no zip at all".getBytes(StandardCharsets.UTF_8)),
                    HttpStatus.UNPROCESSABLE_CONTENT, "invalid_backup_archive");
            assertProblem(learner.upload(IMPORT, "file", ZipFiles.zip(Map.of("data/profile.json", "{}"))),
                    HttpStatus.UNPROCESSABLE_CONTENT, "invalid_backup_archive");
        }

        @Test
        void rejectsAnExportOfANewerVersion() {
            byte[] future = ZipFiles.zip(Map.of("manifest.json", """
                    {"schemaVersion": 6, "exportedAt": "2027-01-01T00:00:00Z"}"""));

            MvcTestResult rejected = learner.upload(IMPORT, "file", future);

            assertProblem(rejected, HttpStatus.UNPROCESSABLE_CONTENT, "unsupported_schema_version");
            assertThat(rejected).bodyJson().extractingPath("$.detail").asString().contains("version 6");
        }

        @Test
        void rejectsEntryNamesThatCouldEscapeADirectory() {
            Map<String, String> entries = new LinkedHashMap<>(entries(export()));
            entries.put("../../evil.json", "{}");

            MvcTestResult rejected = learner.upload(IMPORT, "file", ZipFiles.zip(entries));

            assertProblem(rejected, HttpStatus.UNPROCESSABLE_CONTENT, "invalid_backup_archive");
            assertThat(rejected).bodyJson().extractingPath("$.detail").asString().contains("../../evil.json");
        }

        @Test
        void rejectsFilesBeyondTheSizeLimit() {
            byte[] tooLarge = new byte[20 * 1024 * 1024 + 1];

            assertProblem(learner.upload(IMPORT, "file", tooLarge), HttpStatus.CONTENT_TOO_LARGE, "upload_too_large");
        }

        @Test
        void listsMissingFilesAndFieldsAndUnknownFields() {
            Map<String, String> entries = new LinkedHashMap<>(entries(export()));
            entries.remove("data/review_log.json");
            entries.put("data/attempts.json", changed(entries.get("data/attempts.json"), attempts -> {
                ObjectNode first = (ObjectNode) attempts.get(0);
                first.remove("answeredAt");
                first.put("foo", "bar");
            }));

            MvcTestResult rejected = learner.upload(IMPORT, "file", ZipFiles.zip(entries));

            assertProblem(rejected, HttpStatus.UNPROCESSABLE_CONTENT, "invalid_backup_data");
            assertThat(rejected).bodyJson().extractingPath("$.errors").isEqualTo(List.of(
                    Map.of("field", "data/attempts.json[0].answeredAt", "message", "missing"),
                    Map.of("field", "data/attempts.json[0].foo", "message", "unknown field"),
                    Map.of("field", "data/review_log.json", "message", "missing")));
        }

        @Test
        void listsEveryReferenceToUnknownContent() {
            byte[] foreign = changedExport(Map.of(
                    "data/attempts.json", attempts -> ((ObjectNode) attempts.get(0)).put("exerciseId", "ex_zz_999"),
                    "data/sessions.json", sessions -> ((ArrayNode) sessions.get(0).get("exerciseIds")).add("ex_zz_998"),
                    "data/srs_cards.json", cards -> ((ObjectNode) cards.get(0)).put("itemId", "item_unknown"),
                    "data/skill_mastery.json", mastery -> ((ObjectNode) mastery.get(0)).put("skillTag", "vocab.unknown_tag")));

            MvcTestResult rejected = learner.upload(IMPORT, "file", foreign);

            assertProblem(rejected, HttpStatus.UNPROCESSABLE_CONTENT, "unknown_content_references");
            assertThat(rejected).bodyJson().extractingPath("$.unknownReferences").isEqualTo(Map.of(
                    "exercises", List.of("ex_zz_998", "ex_zz_999"), "items", List.of("item_unknown"), "units", List.of(),
                    "skillTags", List.of("vocab.unknown_tag")));
        }

        @Test
        void rejectsValuesTheDatabaseRefusesAndLeavesTheDataUntouched() {
            byte[] broken = changedExport(Map.of("data/sessions.json",
                    sessions -> ((ObjectNode) sessions.get(0)).put("startedAt", "not-a-time")));
            playGreetingsLessonWithOneRetry();

            MvcTestResult rejected = learner.upload(IMPORT, "file", broken);

            assertProblem(rejected, HttpStatus.UNPROCESSABLE_CONTENT, "invalid_backup_data");
            assertThat(rejected).bodyJson().extractingPath("$.errors[0].field").isEqualTo("data/sessions.json");
            assertThat(rejected).bodyJson().extractingPath("$.errors[0].message").asString().contains("not-a-time");
            assertThat(count("sessions")).isEqualTo(2);
            assertThat(count("attempts")).isEqualTo(12);
        }

        @Test
        void rejectsReferencesToRowsOfAnotherLearner() {
            LearnerFixture fixture = new LearnerFixture(jdbc);
            UUID otherLearner = fixture.learner("Arta");
            UUID otherLesson = fixture.lesson(otherLearner, "a1_u01_greetings", Instant.now());
            byte[] hijacking = changedExport(Map.of("data/attempts.json",
                    attempts -> ((ObjectNode) attempts.get(0)).put("sessionId", otherLesson.toString())));

            MvcTestResult rejected = learner.upload(IMPORT, "file", hijacking);

            assertProblem(rejected, HttpStatus.UNPROCESSABLE_CONTENT, "invalid_backup_data");
            assertThat(rejected).bodyJson().extractingPath("$.errors[0].message").asString().contains("another learner");
            assertThat(count("attempts")).isEqualTo(6);
        }
    }

    /** Five first answers, one of them wrong and retried, then completed for 15 XP (slow, not perfect: 10 + 0 + 5). */
    private void playGreetingsLessonWithOneRetry() {
        String lesson = JSON.readTree(learner.post("/api/lessons", """
                {"unitId": "a1_u01_greetings"}""").getResponse().getContentAsByteArray()).get("sessionId").asString();
        answer(lesson, "ex_a1_u01_002", """
                {"text": "si jeni"}""", false);
        CORRECT_GREETINGS_ANSWERS.forEach((exercise, answer) -> {
            if (!exercise.equals("ex_a1_u01_002")) {
                answer(lesson, exercise, answer, false);
            }
        });
        answer(lesson, "ex_a1_u01_002", CORRECT_GREETINGS_ANSWERS.get("ex_a1_u01_002"), true);
        assertThat(learner.post("/api/lessons/%s/complete".formatted(lesson), "")).hasStatusOk();
    }

    private void answer(String lesson, String exercise, String answer, boolean retry) {
        assertThat(learner.post("/api/lessons/%s/attempts".formatted(lesson), """
                {"exerciseId": "%s", "answer": %s, "responseTimeMs": 3000, "retry": %b}"""
                .formatted(exercise, answer, retry))).hasStatusOk();
    }

    /** Synthetic rows for the tables that later milestones fill (placement, plan, FSRS, streak, streak goal). */
    private void addPlacementPlanAndReviewData() {
        jdbc.sql("""
                UPDATE users SET motivations = '{family,travel}', current_level = 'A1.2', self_assessment = 'few_words',
                                 settings = '{"sounds": true, "requestRetention": 0.9}',
                                 onboarding_completed_at = '2026-09-20T08:00:00Z'""").update();
        jdbc.sql("""
                INSERT INTO streaks (user_id, current_days, longest_days, last_active_date)
                VALUES (:user, 3, 7, '2026-09-24')""").param("user", learnerId).update();
        jdbc.sql("""
                INSERT INTO streak_goals (user_id, target, reached_on, reached_at, updated_at)
                VALUES (:user, 20, '2026-09-24', '2026-09-24T17:30:00Z', '2026-09-24T17:30:00Z')""")
                .param("user", learnerId).update();
        UUID params = jdbc.sql("""
                INSERT INTO fsrs_params (user_id, version, scheduler_version, weights, review_count, metrics)
                VALUES (:user, 1, 'fsrs-6', '{0.212,1.2931,2.3065,8.2956}', 1000, '{"logLoss": 0.3141}') RETURNING id""")
                .param("user", learnerId).query(UUID.class).single();
        UUID plan = jdbc.sql("""
                INSERT INTO learning_plans (user_id, version, generated_by, plan)
                VALUES (:user, 1, 'rule_based_v1', '{"generatedAt": "2026-09-20T08:00:00Z", "generatedBy": "rule_based_v1",
                        "startLevel": "A1.2", "stages": [{"level": "A1.2", "units": [{"unitId": "a1_u03_numbers",
                        "title": "Zahlen 1–100", "status": "planned", "estimatedLessons": 4}]}], "estimates": {"A1": "2026-10-20"}}')
                RETURNING id""").param("user", learnerId).query(UUID.class).single();
        jdbc.sql("""
                INSERT INTO plan_changes (user_id, plan_id, triggered_by, kind, reason, details)
                VALUES (:user, :plan, 'placement', 'plan_created', 'Plan nach der Einstufung erstellt', '{"level": "A1.2"}')""")
                .param("user", learnerId).param("plan", plan).update();
        UUID test = jdbc.sql("""
                INSERT INTO placement_tests (user_id, status, engine, start_level, current_level, result_level, state,
                                             finished_at)
                VALUES (:user, 'completed', 'rule_based_v1', 'A1.1', 'A1.2', 'A1.2', '{"streak": 2}', now())
                RETURNING id""").param("user", learnerId).query(UUID.class).single();
        jdbc.sql("""
                INSERT INTO placement_answers (user_id, placement_test_id, position, exercise_id, level, competence, answer,
                                               outcome, response_ms)
                VALUES (:user, :test, 1, 'ex_a1_u01_001', 'A1.1', 'vocabulary', '{"choice": "Mirëdita"}', 'correct', 2500)""")
                .param("user", learnerId).param("test", test).update();
        // a value that only survives the backup if doubles pass through unchanged
        jdbc.sql("""
                UPDATE srs_cards SET state = 'review', step = NULL, stability = 3.1729999999999996, difficulty = 5.28
                WHERE item_id = 'item_miredita'""").update();
        jdbc.sql("UPDATE review_log SET fsrs_params_id = :params WHERE item_id = 'item_miredita'")
                .param("params", params).update();
    }

    private byte[] export() {
        MvcTestResult export = learner.get(EXPORT);
        assertThat(export).hasStatusOk();
        return export.getResponse().getContentAsByteArray();
    }

    private byte[] changedExport(Map<String, Consumer<JsonNode>> changes) {
        Map<String, String> entries = new LinkedHashMap<>(entries(export()));
        changes.forEach((file, change) -> entries.put(file, changed(entries.get(file), change)));
        return ZipFiles.zip(entries);
    }

    private static String changed(String json, Consumer<JsonNode> change) {
        JsonNode node = JSON.readTree(json);
        change.accept(node);
        return node.toString();
    }

    private static Map<String, String> entries(byte[] archive) {
        return ZipFiles.unzip(archive);
    }

    private static Map<String, String> withoutManifest(Map<String, String> entries) {
        Map<String, String> copy = new LinkedHashMap<>(entries);
        copy.remove("manifest.json");
        return copy;
    }

    private static JsonNode withoutExportTime(String manifest) {
        ObjectNode node = (ObjectNode) JSON.readTree(manifest);
        node.remove("exportedAt");
        return node;
    }

    private String passwordHash() {
        return jdbc.sql("SELECT password_hash FROM users").query(String.class).single();
    }

    private int count(String table) {
        return jdbc.sql("SELECT count(*) FROM " + table).query(Integer.class).single();
    }

    private static List<String> concat(List<String> first, List<String> second) {
        return Stream.concat(first.stream(), second.stream()).toList();
    }

    private static void assertProblem(MvcTestResult result, HttpStatus status, String code) {
        assertThat(result).hasStatus(status).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }

    private static String text(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
