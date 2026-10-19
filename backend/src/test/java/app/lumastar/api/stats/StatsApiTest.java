package app.lumastar.api.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import app.lumastar.ClockedIntegrationTest;
import app.lumastar.LearnerFixture;
import app.lumastar.LearnerFixture.Answer;
import app.lumastar.LessonDriver;
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

/** The statistics of PRD F10 against the synthetic content; the learner starts on A0 on Monday, 5 October 2026. */
class StatsApiTest extends ClockedIntegrationTest {

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;
    private LessonDriver lessons;
    private UUID learnerId;

    @BeforeEach
    void learnerOnA0OnMondayMorning() {
        clock.set(MONDAY_MORNING);
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(SyntheticContent.bundle());
        learner = new SpaClient(mvc);
        learner.register("Erza");
        new PlacementDriver(learner, jdbc).answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
        lessons = new LessonDriver(learner);
        learnerId = jdbc.sql("SELECT id FROM users").query(UUID.class).single();
    }

    @Test
    void aNewLearnerStartsTheFirstStage() {
        JsonNode stats = stats();

        assertThat(stats.get("level")).isEqualTo(json("""
                {"level": "A0", "title": "Stufe A0", "nextLevel": "A1.1", "unitsCompleted": 0, "unitsSkipped": 0,
                 "unitsTotal": 1, "percent": 0, "checkpoint": "locked"}"""));
        assertThat(stats.get("masteryByArea")).isEqualTo(json("""
                [{"area": "vocab", "label": "Wortschatz", "skillTags": 0},
                 {"area": "phrase", "label": "Wendungen", "skillTags": 0},
                 {"area": "grammar", "label": "Grammatik", "skillTags": 0},
                 {"area": "spelling", "label": "Schreiben", "skillTags": 0},
                 {"area": "reading", "label": "Lesen", "skillTags": 0}]"""));
        assertThat(stats.get("topErrors")).isEmpty();
        assertThat(stats.get("learnedWords").asInt()).isZero();
        assertThat(stats.get("heatmap").get("from").asString()).isEqualTo("2025-10-06");
        assertThat(stats.get("heatmap").get("to").asString()).isEqualTo("2026-10-05");
        assertThat(stats.get("heatmap").get("days")).hasSize(365).allSatisfy(day -> assertThat(day.get("minutes").asInt()).isZero());
        assertThat(stats.get("forecast").get("days")).extracting(day -> day.get("date").asString()).containsExactly(
                "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11");
    }

    @Test
    void theLevelProgressFollowsTheCompletedUnitsUpToTheCheckpoint() {
        for (int lesson = 0; lesson < 4; lesson++) {
            lessons.play(LessonDriver.A0_WORDS, "ja");
        }

        JsonNode level = stats().get("level");

        assertThat(level.get("unitsCompleted").asInt()).isEqualTo(1);
        assertThat(level.get("percent").asInt()).isEqualTo(100);
        assertThat(level.get("checkpoint").asString()).isEqualTo("available");
    }

    @Test
    void masteryPerAreaAveragesTheEffectiveMasteryOfItsTags() {
        jdbc.sql("DELETE FROM skill_mastery").update();
        jdbc.sql("""
                INSERT INTO skill_mastery (user_id, skill_tag, mastery, attempts, correct, last_practiced_at)
                VALUES (:user, 'vocab.a0', 0.8, 10, 8, :now), (:user, 'vocab.a1_1', 0.4, 5, 2, :now),
                       (:user, 'grammar.a0', 0.5, 4, 2, :now)""")
                .param("user", learnerId).param("now", SqlTimestamps.of(clock.instant())).update();

        JsonNode areas = stats().get("masteryByArea");

        assertThat(areas.get(0).get("skillTags").asInt()).isEqualTo(2);
        assertThat(areas.get(0).get("mastery").asDouble()).isCloseTo(0.6, within(1e-9));
        assertThat(areas.get(2).get("mastery").asDouble()).isCloseTo(0.5, within(1e-9));
        assertThat(areas.get(1).has("mastery")).as("no phrase tag yet").isFalse();
    }

    @Test
    void theTopErrorsNameTheTagItsMostFrequentCategoryAndHowToPractiseIt() {
        lessons.play(LessonDriver.A0_WORDS, "nein");
        LearnerFixture fixture = new LearnerFixture(jdbc);
        Instant now = clock.instant();
        UUID earlierLesson = fixture.lesson(learnerId, "a1_1_words", now.minus(Duration.ofDays(40)));
        wrongAnswer(fixture, earlierLesson, now.minus(Duration.ofDays(31)));
        wrongAnswer(fixture, earlierLesson, now.minus(Duration.ofDays(29)));

        JsonNode topErrors = stats().get("topErrors");

        assertThat(topErrors).isEqualTo(json("""
                [{"skillTag": "vocab.a0", "label": "Wortschatz A0", "errors": 3, "attempts": 3, "errorRate": 1.0,
                  "category": "vocab.confused", "categoryLabel": "Wort verwechselt",
                  "practice": {"kind": "practice", "skillTag": "vocab.a0"}},
                 {"skillTag": "vocab.a1_1", "label": "Wortschatz A1.1", "errors": 1, "attempts": 1, "errorRate": 1.0,
                  "category": "vocab.unknown", "categoryLabel": "Wort nicht gewusst"}]"""));
        assertThat(learner.post("/api/lessons", topErrors.get(0).get("practice").toString()))
                .as("the practice target starts a practice lesson").hasStatus(HttpStatus.CREATED);
    }

    @Test
    void theHeatmapShowsTheLast365DaysWithPracticeAndStreakDays() {
        lessonOf(Duration.ofMinutes(11));
        clock.advance(Duration.ofDays(2));
        lessonOf(Duration.ofMinutes(12));
        finishedLessonOn("2025-10-07T10:00:00Z");
        finishedLessonOn("2025-10-08T10:00:00Z");

        JsonNode heatmap = stats().get("heatmap");

        List<JsonNode> days = StreamSupport.stream(heatmap.get("days").spliterator(), false).toList();
        assertThat(heatmap.get("from").asString()).isEqualTo("2025-10-08");
        assertThat(days).hasSize(365);
        assertThat(days.getFirst()).as("the oldest day of the window").isEqualTo(json("""
                {"date": "2025-10-08", "minutes": 5, "xp": 0, "lessons": 1, "goalMet": false, "frozen": false}"""));
        assertThat(days.subList(362, 365)).isEqualTo(List.of(
                json("""
                        {"date": "2026-10-05", "minutes": 11, "xp": 20, "lessons": 1, "goalMet": true, "frozen": false}"""),
                json("""
                        {"date": "2026-10-06", "minutes": 0, "xp": 0, "lessons": 0, "goalMet": false, "frozen": true}"""),
                json("""
                        {"date": "2026-10-07", "minutes": 12, "xp": 20, "lessons": 1, "goalMet": true, "frozen": false}""")));
        assertThat(days.stream().mapToInt(day -> day.get("lessons").asInt()).sum()).as("2025-10-07 is outside").isEqualTo(3);
    }

    @Test
    void theForecastCountsTheCardsComingDuePerDayOfTheLearnersTimeZone() {
        card("item_a", "2026-10-04T12:00:00Z", "review");
        card("item_b", "2026-10-05T07:00:00Z", "review");
        card("item_c", "2026-10-05T20:00:00Z", "learning");
        card("item_d", "2026-10-05T22:30:00Z", "learning");
        card("item_e", "2026-10-11T12:00:00Z", "review");
        card("item_f", "2026-10-11T22:30:00Z", "review");
        card("item_g", "2026-10-04T12:00:00Z", "learning");
        jdbc.sql("UPDATE exercises SET item_ids = array_remove(item_ids, 'item_g')").update();

        JsonNode stats = stats();

        JsonNode forecast = stats.get("forecast");
        assertThat(forecast.get("dueNow").asInt()).as("item_g has no exercise to review it with").isEqualTo(2);
        assertThat(forecast.get("dueToday").asInt()).isEqualTo(3);
        assertThat(forecast.get("dueTomorrow").asInt()).as("22:30 UTC is 00:30 in Zurich").isEqualTo(1);
        assertThat(forecast.get("days")).extracting(day -> day.get("due").asInt()).containsExactly(3, 1, 0, 0, 0, 0, 1);
        assertThat(stats.get("learnedWords").asInt()).isEqualTo(4);
    }

    @Test
    void requiresASignedInLearner() {
        assertThat(new SpaClient(mvc).get("/api/stats")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private JsonNode stats() {
        MvcTestResult stats = learner.get("/api/stats");
        assertThat(stats).hasStatusOk();
        return PlacementDriver.body(stats);
    }

    private void lessonOf(Duration duration) {
        JsonNode lesson = lessons.start(LessonDriver.A0_WORDS);
        clock.advance(duration);
        lessons.answerAll(lesson, "ja");
        lessons.complete(lesson);
    }

    /** A five-minute lesson without XP, finished at {@code finishedAt}. */
    private void finishedLessonOn(String finishedAt) {
        Instant end = Instant.parse(finishedAt);
        jdbc.sql("""
                        INSERT INTO sessions (user_id, kind, unit_id, level, composed_by, started_at, finished_at,
                                              exercise_count, correct_count, accuracy)
                        VALUES (:user, 'lesson', 'a0_words', 'A0', 'rule_based_v1', :start, :end, 3, 3, 1)""")
                .param("user", learnerId)
                .param("start", SqlTimestamps.of(end.minus(Duration.ofMinutes(5))))
                .param("end", SqlTimestamps.of(end))
                .update();
    }

    private void wrongAnswer(LearnerFixture fixture, UUID lesson, Instant at) {
        fixture.answer(learnerId, lesson, new Answer("ex_a1_1_001", "multiple_choice", List.of("vocab.a1_1"),
                "{\"choice\": \"nein\"}", "wrong", "vocab.unknown", "ja", false, at));
    }

    /** A card of a new word that an exercise of A0 practises, so that it can be reviewed. */
    private void card(String itemId, String due, String state) {
        jdbc.sql("INSERT INTO content_items (id, unit_id, kind, gheg, de) VALUES (:item, 'a0_words', 'word', 'po', 'ja')")
                .param("item", itemId).update();
        jdbc.sql("UPDATE exercises SET item_ids = array_append(item_ids, :item) WHERE id = 'ex_a0_001'")
                .param("item", itemId).update();
        jdbc.sql("""
                        INSERT INTO srs_cards (user_id, item_id, state, due, reps, lapses)
                        VALUES (:user, :item, :state, :due, 1, 0)""")
                .param("user", learnerId)
                .param("item", itemId)
                .param("state", state)
                .param("due", SqlTimestamps.of(Instant.parse(due)))
                .update();
    }

    private static JsonNode json(String json) {
        return PlacementDriver.JSON.readTree(json);
    }
}
