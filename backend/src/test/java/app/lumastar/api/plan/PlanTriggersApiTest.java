package app.lumastar.api.plan;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.PlacementDriver;
import app.lumastar.SpaClient;
import app.lumastar.SyntheticContent;
import app.lumastar.content.ContentSeeder;
import app.lumastar.persistence.SqlTimestamps;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/** Plan revisions after lessons: focus suggestions and every 7 learning days, also as a daily job. */
class PlanTriggersApiTest extends IntegrationTest {

    @Autowired
    private ContentSeeder seeder;

    @Autowired
    private PeriodicPlanRevision periodicRevision;

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
    void threeWrongAnswersOnATagSuggestAFocusLessonAndInsertItIntoThePlan() {
        JsonNode result = playA0Words("nein");

        assertThat(result.get("focusSuggestion")).isEqualTo(PlacementDriver.JSON.readTree("""
                {"skillTag": "vocab.a0", "label": "Wortschatz A0", "unitId": "focus_vocab.a0_1"}"""));
        JsonNode changes = history();
        assertThat(changes.get(0).get("trigger").asString()).isEqualTo("lesson");
        assertThat(changes.get(0).get("reason").asString()).isEqualTo("Lektion mit 3 Fehlern bei ‚Wortschatz A0‘");
        assertThat(changes.get(1).get("reason").asString()).isEqualTo("Fokus-Lektion ‚Wortschatz A0‘ eingefügt, Fehlerquote 100 %");
        assertThat(planVersion()).isEqualTo(2);
    }

    @Test
    void aSuggestionTakesThePlaceOfTheOldestOpenFocusUnitWhenTwoAreOpen() {
        openFocusUnits("grammar.a0", "phrase.a0");

        JsonNode result = playA0Words("nein");

        assertThat(result.get("focusSuggestion").get("unitId").asString()).isEqualTo("focus_vocab.a0_1");
        assertThat(focusUnitsOnThePath()).containsExactly("focus_vocab.a0_1", "focus_phrase.a0_1");
        assertThat(history()).filteredOn(change -> change.get("planVersion").asInt() == 2)
                .extracting(change -> change.get("reason").asString())
                .containsExactlyInAnyOrder("Lektion mit 3 Fehlern bei ‚Wortschatz A0‘",
                        "Fokus-Lektion ‚Grammatik A0‘ ersetzt: höchstens 2 offene Fokus-Lektionen",
                        "Fokus-Lektion ‚Wortschatz A0‘ eingefügt, Fehlerquote 100 %");
        assertThat(planVersion()).isEqualTo(2);
    }

    @Test
    void completingAgainKeepsTheSuggestionWithoutAnotherRevision() {
        String lesson = startA0Words();
        answerAll(lesson, "nein");
        complete(lesson);

        JsonNode again = complete(lesson);

        assertThat(again.get("focusSuggestion").get("unitId").asString()).isEqualTo("focus_vocab.a0_1");
        assertThat(planVersion()).isEqualTo(2);
    }

    @Test
    void anOpenFocusUnitOfTheTagIsSuggestedAgainWithoutARevision() {
        playA0Words("nein");

        JsonNode second = playA0Words("nein");

        assertThat(second.get("focusSuggestion").get("unitId").asString()).isEqualTo("focus_vocab.a0_1");
        assertThat(planVersion()).isEqualTo(2);
    }

    @Test
    void aGoodLessonSuggestsNothingAndKeepsThePlan() {
        JsonNode result = playA0Words("ja");

        assertThat(result.has("focusSuggestion")).isFalse();
        assertThat(planVersion()).isEqualTo(1);
    }

    @Test
    void theSeventhLearningDayRevisesThePlan() {
        planMadeDaysAgo(10);
        learningDaysBefore(6);

        playA0Words("ja");

        JsonNode latest = history().get(0);
        assertThat(latest.get("trigger").asString()).isEqualTo("periodic");
        assertThat(latest.get("reason").asString()).isEqualTo("Regelmässige Anpassung nach 7 Lerntagen");
        assertThat(planVersion()).isEqualTo(2);
    }

    @Test
    void sixLearningDaysAreNotEnough() {
        planMadeDaysAgo(10);
        learningDaysBefore(5);

        playA0Words("ja");

        assertThat(planVersion()).isEqualTo(1);
    }

    @Test
    void theDailyJobRevisesAPlanThatIsDueAndOnlyOnce() {
        planMadeDaysAgo(10);
        learningDaysBefore(7);

        periodicRevision.reviseDuePlans();
        periodicRevision.reviseDuePlans();

        assertThat(planVersion()).isEqualTo(2);
        assertThat(history().get(0).get("trigger").asString()).isEqualTo("periodic");
    }

    @Test
    void theDailyJobLeavesARecentPlanAlone() {
        learningDaysBefore(0);

        periodicRevision.reviseDuePlans();

        assertThat(planVersion()).isEqualTo(1);
    }

    /** Appends open focus units for the tags, in this order, to the first stage of the stored plan. */
    private void openFocusUnits(String... tags) {
        for (String tag : tags) {
            jdbc.sql("""
                            UPDATE learning_plans SET plan = jsonb_insert(plan, '{stages,0,units,-1}', jsonb_build_object(
                                'unitId', 'focus_' || :tag || '_1', 'title', 'Fokus', 'status', 'planned',
                                'estimatedLessons', 1, 'reason', 'Fehlerquote 60 %'), true)""")
                    .param("tag", tag)
                    .update();
        }
    }

    private List<String> focusUnitsOnThePath() {
        return StreamSupport.stream(PlacementDriver.body(learner.get("/api/path")).get("stages").spliterator(), false)
                .flatMap(stage -> StreamSupport.stream(stage.get("units").spliterator(), false))
                .filter(unit -> unit.get("focus").asBoolean())
                .map(unit -> unit.get("unitId").asString())
                .toList();
    }

    private void planMadeDaysAgo(int days) {
        jdbc.sql("UPDATE learning_plans SET valid_from = now() - make_interval(days => :days)").param("days", days).update();
    }

    /** One completed lesson on each of the last {@code days} days before today, Zurich time. */
    private void learningDaysBefore(int days) {
        UUID user = jdbc.sql("SELECT id FROM users").query(UUID.class).single();
        for (int day = 1; day <= days; day++) {
            Instant at = Instant.now().minus(Duration.ofDays(day));
            jdbc.sql("""
                            INSERT INTO sessions (user_id, kind, unit_id, level, composed_by, started_at, finished_at,
                                                  exercise_count, correct_count, accuracy)
                            VALUES (:user, 'lesson', 'a0_words', 'A0', 'rule_based_v1', :at, :at, 3, 3, 1)""")
                    .param("user", user)
                    .param("at", SqlTimestamps.of(at))
                    .update();
        }
    }

    private int planVersion() {
        return jdbc.sql("SELECT max(version) FROM learning_plans").query(Integer.class).single();
    }

    private JsonNode history() {
        MvcTestResult changes = learner.get("/api/plan/changes");
        assertThat(changes).hasStatusOk();
        return PlacementDriver.body(changes);
    }

    private JsonNode playA0Words(String answer) {
        String lesson = startA0Words();
        answerAll(lesson, answer);
        return complete(lesson);
    }

    private String startA0Words() {
        MvcTestResult started = learner.post("/api/lessons", """
                {"unitId": "a0_words"}""");
        assertThat(started).hasStatus(HttpStatus.CREATED);
        return PlacementDriver.body(started).get("sessionId").asString();
    }

    private void answerAll(String lesson, String answer) {
        for (String exercise : jdbc.sql("SELECT unnest(exercise_ids) FROM sessions WHERE id = :id")
                .param("id", UUID.fromString(lesson)).query(String.class).list()) {
            assertThat(learner.post("/api/lessons/%s/attempts".formatted(lesson), """
                    {"exerciseId": "%s", "answer": {"choice": "%s"}, "responseTimeMs": 2000}""".formatted(exercise, answer)))
                    .hasStatusOk();
        }
    }

    private JsonNode complete(String lesson) {
        MvcTestResult completed = learner.post("/api/lessons/%s/complete".formatted(lesson), "");
        assertThat(completed).hasStatusOk();
        return PlacementDriver.body(completed);
    }
}
