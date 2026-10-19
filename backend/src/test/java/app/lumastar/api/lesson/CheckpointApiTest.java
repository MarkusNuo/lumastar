package app.lumastar.api.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.PlacementDriver;
import app.lumastar.SpaClient;
import app.lumastar.SyntheticContent;
import app.lumastar.content.ContentSeeder;
import app.lumastar.domain.Level;
import app.lumastar.export.ZipFiles;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/**
 * Checkpoints at the end of a stage: availability on the path, passing and failing, the level-up, the
 * level badges and the plan revision. The synthetic content has exercises in A0 and A1.1 (three each).
 */
class CheckpointApiTest extends IntegrationTest {

    private static final String VOCAB_FOCUS = "focus_vocab.a0_1";

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;

    @BeforeEach
    void learnerOnA0WithSyntheticContent() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(SyntheticContent.bundle());
        learner = new SpaClient(mvc);
        learner.register("Erza");
        new PlacementDriver(learner, jdbc).answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
    }

    @Test
    void aCheckpointOpensOnceEveryUnitOfTheStageWithExercisesIsDone() {
        assertThat(checkpointStatuses()).containsEntry("A0", "locked").containsEntry("A1.1", "locked")
                .containsEntry("A1.2", "locked");
        assertProblem(startCheckpoint("A0"), HttpStatus.CONFLICT, "checkpoint_locked");

        completeUnit(SyntheticContent.wordsUnit(Level.A0));

        assertThat(checkpointStatuses()).containsEntry("A0", "available").containsEntry("A1.1", "locked");
    }

    @Test
    void thePathTellsHowManyExercisesACheckpointHasAndTheAccuracyToPassIt() {
        JsonNode stages = PlacementDriver.body(learner.get("/api/path")).get("stages");

        assertThat(stages.get(0).get("level").asString()).isEqualTo("A0");
        assertThat(stages.get(0).get("checkpoint")).as("all three exercises of A0").isEqualTo(PlacementDriver.JSON.readTree("""
                {"status": "locked", "exerciseCount": 3, "requiredAccuracy": 0.8}"""));
        assertThat(stages.get(2).get("level").asString()).isEqualTo("A1.2");
        assertThat(stages.get(2).get("checkpoint").get("exerciseCount").asInt()).as("no exercises yet").isZero();
    }

    @Test
    void anOpenFocusUnitHoldsBackNeitherTheNextUnitNorTheCheckpointAndStaysOpenAfterTheLevelUp() {
        JsonNode wrong = play(PlacementDriver.body(learner.post("/api/lessons", """
                {"unitId": "a0_words"}""")), "nein");
        assertThat(wrong.get("focusSuggestion").get("unitId").asString()).isEqualTo(VOCAB_FOCUS);
        completeUnit(SyntheticContent.wordsUnit(Level.A0));

        assertThat(unitStatuses()).containsSequence(Map.entry("a0_words", "completed"), Map.entry(VOCAB_FOCUS, "planned"),
                Map.entry("a0_grammar", "planned"), Map.entry("a1_1_words", "in_progress"));
        assertThat(checkpointStatuses()).containsEntry("A0", "available");

        play(PlacementDriver.body(startCheckpoint("A0")), "ja");

        assertThat(unitStatuses()).startsWith(Map.entry(VOCAB_FOCUS, "planned"), Map.entry("a1_1_words", "in_progress"),
                Map.entry("a1_1_grammar", "planned"));
        JsonNode focus = PlacementDriver.body(learner.get("/api/path")).get("stages").get(0).get("units").get(0);
        assertThat(focus.get("hasContent").asBoolean()).as("still playable on A1.1").isTrue();
    }

    @Test
    void aCheckpointIsPlayedLikeALessonFromTheExercisesOfTheStage() {
        completeUnit(SyntheticContent.wordsUnit(Level.A0));

        MvcTestResult started = startCheckpoint("A0");

        assertThat(started).hasStatus(HttpStatus.CREATED);
        JsonNode checkpoint = PlacementDriver.body(started);
        assertThat(checkpoint.get("kind").asString()).isEqualTo("checkpoint");
        assertThat(checkpoint.get("unitId").asString()).isEqualTo("checkpoint_A0");
        assertThat(checkpoint.get("exercises")).extracting(exercise -> exercise.get("id").asString())
                .containsExactlyInAnyOrder("ex_a0_001", "ex_a0_002", "ex_a0_003");
        assertThat(jdbc.sql("SELECT kind || '|' || level || '|' || coalesce(unit_id, '-') FROM sessions WHERE kind = 'checkpoint'")
                .query(String.class).single()).isEqualTo("checkpoint|A0|-");
    }

    @Test
    void passingMovesTheLearnerUpAndRevisesThePlan() {
        completeUnit(SyntheticContent.wordsUnit(Level.A0));

        JsonNode result = play(PlacementDriver.body(startCheckpoint("A0")), "ja");

        assertThat(result.get("kind").asString()).isEqualTo("checkpoint");
        assertThat(result.get("checkpoint")).isEqualTo(PlacementDriver.JSON.readTree("""
                {"level": "A0", "passed": true, "requiredAccuracy": 0.8, "newLevel": "A1.1", "badges": []}"""));
        assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.currentLevel").isEqualTo("A1.1");
        JsonNode change = PlacementDriver.body(learner.get("/api/plan/changes")).get(0);
        assertThat(change.get("trigger").asString()).isEqualTo("checkpoint");
        assertThat(change.get("type").asString()).isEqualTo("level_changed");
        assertThat(change.get("reason").asString()).isEqualTo("Checkpoint A0 bestanden → A1.1");
        assertThat(PlacementDriver.body(learner.get("/api/path")).get("stages").get(0).get("level").asString())
                .isEqualTo("A1.1");
    }

    @Test
    void thePathShowsTheStagePassedLastAboveTheCurrentStage() {
        assertThat(PlacementDriver.body(learner.get("/api/path")).has("previousStage")).isFalse();
        completeUnit(SyntheticContent.wordsUnit(Level.A0));

        play(PlacementDriver.body(startCheckpoint("A0")), "ja");

        JsonNode previous = PlacementDriver.body(learner.get("/api/path")).get("previousStage");
        assertThat(previous.get("level").asString()).isEqualTo("A0");
        assertThat(previous.get("title").asString()).isEqualTo("Stufe A0");
        assertThat(previous.get("accuracy").asDouble()).isEqualTo(1.0);
        assertThat(Instant.parse(previous.get("passedAt").asString())).isBeforeOrEqualTo(Instant.now());
        jdbc.sql("UPDATE users SET current_level = 'A0'").update();
        assertThat(PlacementDriver.body(learner.get("/api/path")).has("previousStage"))
                .as("a stage at or above the current level is on the path itself").isFalse();
    }

    @Test
    void failingKeepsTheLevelAndTheCheckpointAvailable() {
        completeUnit(SyntheticContent.wordsUnit(Level.A0));

        JsonNode result = play(PlacementDriver.body(startCheckpoint("A0")), "nein");

        assertThat(result.get("checkpoint")).isEqualTo(PlacementDriver.JSON.readTree("""
                {"level": "A0", "passed": false, "requiredAccuracy": 0.8, "badges": []}"""));
        assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.currentLevel").isEqualTo("A0");
        assertThat(checkpointStatuses()).containsEntry("A0", "available");
        JsonNode change = PlacementDriver.body(learner.get("/api/plan/changes")).get(0);
        assertThat(change.get("trigger").asString()).isEqualTo("checkpoint");
        assertThat(change.get("reason").asString()).isEqualTo("Checkpoint A0 nicht bestanden (0 %)");
    }

    @Test
    void aFailedCheckpointLogsNoFocusRequestForATagWithAnOpenFocusUnit() {
        play(PlacementDriver.body(learner.post("/api/lessons", """
                {"unitId": "a0_words"}""")), "nein");
        completeUnit(SyntheticContent.wordsUnit(Level.A0));

        play(PlacementDriver.body(startCheckpoint("A0")), "nein");

        JsonNode changes = PlacementDriver.body(learner.get("/api/plan/changes"));
        int latest = changes.get(0).get("planVersion").asInt();
        assertThat(changes).filteredOn(change -> change.get("planVersion").asInt() == latest)
                .extracting(change -> change.get("reason").asString())
                .containsExactly("Checkpoint A0 nicht bestanden (0 %)");
        assertThat(PlacementDriver.body(learner.get("/api/path")).has("previousStage")).isFalse();
    }

    @Test
    void completingAgainReturnsTheSameResultWithoutAnotherLevelUp() {
        completeUnit(SyntheticContent.wordsUnit(Level.A0));
        JsonNode checkpoint = PlacementDriver.body(startCheckpoint("A0"));
        JsonNode first = play(checkpoint, "ja");

        JsonNode again = complete(checkpoint.get("sessionId").asString());

        assertThat(again.get("checkpoint")).isEqualTo(first.get("checkpoint"));
        assertThat(learner.get("/api/me")).bodyJson().extractingPath("$.currentLevel").isEqualTo("A1.1");
        assertThat(jdbc.sql("SELECT count(*) FROM plan_changes WHERE triggered_by = 'checkpoint'").query(Integer.class).single())
                .isEqualTo(1);
    }

    @Test
    void passingTheLastStageOfABandAwardsItsBadge() {
        onA1_3WithExercises();
        completeUnit(SyntheticContent.wordsUnit(Level.A1_3));

        JsonNode result = play(PlacementDriver.body(startCheckpoint("A1.3")), "ja");

        assertThat(result.get("checkpoint").get("newLevel").asString()).isEqualTo("A2.1");
        assertThat(result.get("checkpoint").get("badges")).extracting(JsonNode::asString).containsExactly("A1");
        MvcTestResult badges = learner.get("/api/badges");
        assertThat(badges).hasStatusOk().bodyJson().extractingPath("$[*].code").isEqualTo(List.of("A1"));
        assertThat(badges).bodyJson().extractingPath("$[0].awardedAt").asString().isNotBlank();
    }

    @Test
    void badgesAreExportedAndImported() {
        onA1_3WithExercises();
        completeUnit(SyntheticContent.wordsUnit(Level.A1_3));
        play(PlacementDriver.body(startCheckpoint("A1.3")), "ja");
        byte[] export = learner.get("/api/profile/export").getResponse().getContentAsByteArray();
        JsonNode exported = PlacementDriver.JSON.readTree(ZipFiles.unzip(export).get("data/badges.json"));
        assertThat(exported).singleElement().satisfies(badge -> {
            assertThat(badge.get("code").asString()).isEqualTo("A1");
            assertThat(badge.get("sessionId").asString()).isNotBlank();
        });
        JsonNode before = PlacementDriver.body(learner.get("/api/badges"));
        jdbc.sql("DELETE FROM badges").update();

        assertThat(learner.upload("/api/profile/import", "file", export)).hasStatusOk()
                .bodyJson().extractingPath("$.imported.badges").isEqualTo(1);
        assertThat(PlacementDriver.body(learner.get("/api/badges"))).isEqualTo(before);
    }

    @Test
    void aStageOutsideThePlanHasNoCheckpoint() {
        assertProblem(startCheckpoint("A0"), HttpStatus.CONFLICT, "checkpoint_locked");
        jdbc.sql("UPDATE users SET current_level = 'A1.1'").update();
        changeDailyGoal(15);

        assertProblem(startCheckpoint("A0"), HttpStatus.NOT_FOUND, "checkpoint_not_found");
        assertThat(learner.post("/api/checkpoints", "{}")).hasStatus(HttpStatus.BAD_REQUEST);
    }

    @Test
    void theBadgesOfANewLearnerAreEmptyAndNeedASignIn() {
        assertThat(learner.get("/api/badges")).hasStatusOk().bodyJson().isStrictlyEqualTo("[]");
        assertThat(new SpaClient(mvc).get("/api/badges")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(learner.postWithoutCsrfHeader("/api/checkpoints", "{\"level\": \"A0\"}")).hasStatus(HttpStatus.FORBIDDEN);
    }

    /** Moves the learner to A1.3 and gives its word unit the three exercises of A1.1, so that its checkpoint can open. */
    private void onA1_3WithExercises() {
        jdbc.sql("""
                INSERT INTO exercises (id, pool, unit_id, type, level, difficulty, skill_tags, item_ids, prompt_lang, prompt_text,
                                       explanation, payload, source, reviewed)
                SELECT replace(id, 'a1_1', 'a1_3'), pool, 'a1_3_words', type, 'A1.3', difficulty, ARRAY['vocab.a1_3'], item_ids,
                       prompt_lang, prompt_text, explanation, payload, source, reviewed
                FROM exercises WHERE unit_id = 'a1_1_words'""").update();
        jdbc.sql("UPDATE content_units SET has_content = true WHERE id = 'a1_3_words'").update();
        jdbc.sql("UPDATE users SET current_level = 'A1.3'").update();
        changeDailyGoal(15);
    }

    private void changeDailyGoal(int minutes) {
        assertThat(learner.put("/api/onboarding", """
                {"motivations": ["family"], "dailyGoalMinutes": %d, "selfAssessment": "nothing"}""".formatted(minutes)))
                .hasStatusOk();
    }

    /** The units of the path in path order with their status. */
    private List<Map.Entry<String, String>> unitStatuses() {
        JsonNode path = PlacementDriver.body(learner.get("/api/path"));
        return StreamSupport.stream(path.get("stages").spliterator(), false)
                .flatMap(stage -> StreamSupport.stream(stage.get("units").spliterator(), false))
                .map(unit -> Map.entry(unit.get("unitId").asString(), unit.get("status").asString()))
                .toList();
    }

    private Map<String, String> checkpointStatuses() {
        JsonNode path = PlacementDriver.body(learner.get("/api/path"));
        return StreamSupport.stream(path.get("stages").spliterator(), false)
                .collect(Collectors.toMap(stage -> stage.get("level").asString(),
                        stage -> stage.get("checkpoint").get("status").asString()));
    }

    /** Plays as many lessons of the unit as it takes, every answer correct. */
    private void completeUnit(String unitId) {
        int lessons = jdbc.sql("SELECT estimated_lessons FROM content_units WHERE id = :id").param("id", unitId)
                .query(Integer.class).single();
        for (int i = 0; i < lessons; i++) {
            MvcTestResult started = learner.post("/api/lessons", """
                    {"unitId": "%s"}""".formatted(unitId));
            assertThat(started).hasStatus(HttpStatus.CREATED);
            play(PlacementDriver.body(started), "ja");
        }
    }

    private MvcTestResult startCheckpoint(String level) {
        return learner.post("/api/checkpoints", """
                {"level": "%s"}""".formatted(level));
    }

    /** Answers every exercise with the choice (the synthetic solution is "ja") and completes the lesson. */
    private JsonNode play(JsonNode lesson, String choice) {
        String sessionId = lesson.get("sessionId").asString();
        for (JsonNode exercise : lesson.get("exercises")) {
            assertThat(learner.post("/api/lessons/%s/attempts".formatted(sessionId), """
                    {"exerciseId": "%s", "answer": {"choice": "%s"}, "responseTimeMs": 2000}"""
                    .formatted(exercise.get("id").asString(), choice))).hasStatusOk();
        }
        return complete(sessionId);
    }

    private JsonNode complete(String sessionId) {
        MvcTestResult completed = learner.post("/api/lessons/%s/complete".formatted(sessionId), "");
        assertThat(completed).hasStatusOk();
        return PlacementDriver.body(completed);
    }

    private static void assertProblem(MvcTestResult result, HttpStatus status, String code) {
        assertThat(result).hasStatus(status).bodyJson().extractingPath("$.code").isEqualTo(code);
    }
}
