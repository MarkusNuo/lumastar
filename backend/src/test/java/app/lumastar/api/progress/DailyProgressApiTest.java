package app.lumastar.api.progress;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.ClockedIntegrationTest;
import app.lumastar.LessonDriver;
import app.lumastar.PlacementDriver;
import app.lumastar.SpaClient;
import app.lumastar.SyntheticContent;
import app.lumastar.content.ContentSeeder;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/**
 * Daily goal and streak (PRD F9) across days, ISO weeks and time zones, with the clock of the application moved by the
 * test. The learner starts on A0 with a daily goal of 10 minutes on Monday, 5 October 2026.
 */
class DailyProgressApiTest extends ClockedIntegrationTest {

    private static final Duration DAY = Duration.ofDays(1);

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;
    private LessonDriver lessons;

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
    }

    @Test
    void aNewLearnerHasNotPractisedYet() {
        assertThat(learner.get("/api/progress/today")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"date": "2026-10-05", "minutesToday": 0, "goalMinutes": 10, "goalMet": false, "xpToday": 0,
                 "lessonsToday": 0,
                 "streak": {"current": 0, "longest": 0, "freezesLeft": 1, "extendedToday": false,
                            "freezeUsedYesterday": false}}""");
    }

    @Test
    void lessonsAddUpToTheDailyGoalAndTheLessonThatMeetsItExtendsTheStreak() {
        JsonNode first = lessonOf(Duration.ofMinutes(6));
        JsonNode second = lessonOf(Duration.ofMinutes(5));
        JsonNode third = lessonOf(Duration.ofMinutes(4));

        assertThat(first.get("dailyGoal")).isEqualTo(json("""
                {"minutesToday": 6, "goalMinutes": 10, "goalMet": false, "justMet": false}"""));
        assertThat(first.get("streak")).isEqualTo(json("""
                {"current": 0, "previous": 0, "extendedToday": false, "freezeUsed": false}"""));
        assertThat(second.get("dailyGoal")).isEqualTo(json("""
                {"minutesToday": 11, "goalMinutes": 10, "goalMet": true, "justMet": true}"""));
        assertThat(second.get("streak")).isEqualTo(json("""
                {"current": 1, "previous": 0, "extendedToday": true, "freezeUsed": false}"""));
        assertThat(third.get("dailyGoal").get("justMet").asBoolean()).isFalse();
        assertThat(third.get("streak").get("current").asInt()).isEqualTo(1);
        assertThat(third.get("streak").get("previous").asInt()).as("a lesson after the goal was met").isEqualTo(1);
        assertThat(learner.get("/api/progress/today")).bodyJson().isStrictlyEqualTo("""
                {"date": "2026-10-05", "minutesToday": 15, "goalMinutes": 10, "goalMet": true, "xpToday": 60,
                 "lessonsToday": 3,
                 "streak": {"current": 1, "longest": 1, "freezesLeft": 1, "extendedToday": true,
                            "lastActiveDate": "2026-10-05", "freezeUsedYesterday": false}}""");
    }

    @Test
    void aLessonLeftOpenForHoursCountsWithThirtyMinutes() {
        JsonNode result = lessonOf(Duration.ofHours(3));

        assertThat(result.get("dailyGoal").get("minutesToday").asInt()).isEqualTo(30);
        assertThat(today().get("minutesToday").asInt()).isEqualTo(30);
    }

    @Test
    void theStreakGrowsOnEveryDayTheGoalIsMet() {
        lessonOf(Duration.ofMinutes(11));
        clock.advance(DAY);

        JsonNode tuesday = today();
        JsonNode result = lessonOf(Duration.ofMinutes(11));

        assertThat(tuesday.get("streak").get("current").asInt()).as("standing, not extended yet").isEqualTo(1);
        assertThat(tuesday.get("streak").get("extendedToday").asBoolean()).isFalse();
        assertThat(result.get("streak").get("current").asInt()).isEqualTo(2);
        assertThat(result.get("streak").get("previous").asInt()).isEqualTo(1);
        assertThat(today().get("streak").get("longest").asInt()).isEqualTo(2);
    }

    @Test
    void aSingleMissedDayIsBridgedByTheWeeklyStreakFreeze() {
        lessonOf(Duration.ofMinutes(11));
        clock.advance(DAY.multipliedBy(2));

        JsonNode wednesday = today();
        JsonNode result = lessonOf(Duration.ofMinutes(11));

        assertThat(wednesday.get("streak")).isEqualTo(json("""
                {"current": 1, "longest": 1, "freezesLeft": 0, "extendedToday": false, "lastActiveDate": "2026-10-05",
                 "freezeUsedYesterday": true}"""));
        assertThat(result.get("streak")).isEqualTo(json("""
                {"current": 2, "previous": 1, "extendedToday": true, "freezeUsed": true}"""));
        assertThat(today().get("streak")).isEqualTo(json("""
                {"current": 2, "longest": 2, "freezesLeft": 0, "extendedToday": true, "lastActiveDate": "2026-10-07",
                 "freezeUsedYesterday": true}"""));
        assertThat(jdbc.sql("SELECT string_agg(day || ':' || kind, ',' ORDER BY day) FROM streak_days")
                .query(String.class).single()).isEqualTo("2026-10-05:goal_met,2026-10-06:freeze,2026-10-07:goal_met");
    }

    @Test
    void theFreezeBridgesOneMissedDayPerIsoWeek() {
        lessonOf(Duration.ofMinutes(11));
        clock.advance(DAY.multipliedBy(2));
        lessonOf(Duration.ofMinutes(11));
        clock.advance(DAY.multipliedBy(2));

        JsonNode friday = lessonOf(Duration.ofMinutes(11));

        assertThat(friday.get("streak")).isEqualTo(json("""
                {"current": 1, "previous": 0, "extendedToday": true, "freezeUsed": false}"""));
        assertThat(today().get("streak").get("longest").asInt()).isEqualTo(2);
    }

    @Test
    void theFreezeOfANewWeekBridgesAgain() {
        clock.set(Instant.parse("2026-10-10T08:00:00Z"));
        lessonOf(Duration.ofMinutes(11));
        clock.advance(DAY.multipliedBy(2));

        JsonNode monday = lessonOf(Duration.ofMinutes(11));

        assertThat(monday.get("streak").get("freezeUsed").asBoolean()).as("Sunday bridged by the freeze of its week").isTrue();
        assertThat(today().get("streak").get("freezesLeft").asInt()).as("Monday starts a week with a new freeze").isEqualTo(1);
    }

    @Test
    void twoMissedDaysInARowEndTheStreak() {
        lessonOf(Duration.ofMinutes(11));
        clock.advance(DAY.multipliedBy(3));

        JsonNode thursday = today();
        JsonNode result = lessonOf(Duration.ofMinutes(11));

        assertThat(thursday.get("streak")).isEqualTo(json("""
                {"current": 0, "longest": 1, "freezesLeft": 1, "extendedToday": false, "lastActiveDate": "2026-10-05",
                 "freezeUsedYesterday": false}"""));
        assertThat(result.get("streak")).isEqualTo(json("""
                {"current": 1, "previous": 0, "extendedToday": true, "freezeUsed": false}"""));
    }

    @Test
    void theDayEndsAtMidnightInTheLearnersTimeZone() {
        clock.set(Instant.parse("2026-10-05T21:30:00Z"));
        lessonOf(Duration.ofMinutes(11));
        clock.set(Instant.parse("2026-10-05T22:05:00Z"));

        JsonNode zurich = today();
        changeSettings(10, "America/New_York");
        JsonNode newYork = today();

        assertThat(zurich.get("date").asString()).isEqualTo("2026-10-06");
        assertThat(zurich.get("minutesToday").asInt()).isZero();
        assertThat(zurich.get("streak").get("extendedToday").asBoolean()).isFalse();
        assertThat(newYork.get("date").asString()).isEqualTo("2026-10-05");
        assertThat(newYork.get("minutesToday").asInt()).isEqualTo(11);
        assertThat(newYork.get("streak").get("extendedToday").asBoolean()).isTrue();
    }

    @Test
    void aLowerDailyGoalThatIsMetAlreadyExtendsTheStreak() {
        JsonNode result = lessonOf(Duration.ofMinutes(6));

        changeSettings(5, "Europe/Zurich");

        assertThat(result.get("streak").get("current").asInt()).isZero();
        JsonNode today = today();
        assertThat(today.get("goalMet").asBoolean()).isTrue();
        assertThat(today.get("streak").get("current").asInt()).isEqualTo(1);
        assertThat(jdbc.sql("SELECT goal_minutes || '|' || (session_id IS NULL) FROM streak_days").query(String.class).single())
                .isEqualTo("5|true");
    }

    @Test
    void aHigherDailyGoalKeepsTheStreakOfToday() {
        lessonOf(Duration.ofMinutes(11));

        changeSettings(15, "Europe/Zurich");

        JsonNode today = today();
        assertThat(today.get("goalMet").asBoolean()).isFalse();
        assertThat(today.get("streak").get("extendedToday").asBoolean()).isTrue();
    }

    @Test
    void aCompletedPlacementTestCountsAsPracticeAndItsResultCelebratesTheGoalItMet() {
        JsonNode result = placementOf(Duration.ofMinutes(12)).result();

        assertThat(result.get("dailyGoal")).isEqualTo(json("""
                {"minutesToday": 12, "goalMinutes": 10, "goalMet": true, "justMet": true}"""));
        assertThat(result.get("streak")).isEqualTo(json("""
                {"current": 1, "previous": 0, "extendedToday": true, "freezeUsed": false}"""));
        JsonNode today = today();
        assertThat(today.get("minutesToday").asInt()).isEqualTo(12);
        assertThat(today.get("lessonsToday").asInt()).isZero();
        assertThat(today.get("streak").get("current").asInt()).isEqualTo(1);
        assertThat(jdbc.sql("SELECT (placement_test_id IS NOT NULL) || '|' || (session_id IS NULL) FROM streak_days")
                .query(String.class).single()).isEqualTo("true|true");
    }

    @Test
    void aPlacementTestAfterTheGoalWasMetDoesNotMeetItAgain() {
        lessonOf(Duration.ofMinutes(11));

        JsonNode result = placementOf(Duration.ofMinutes(5)).result();

        assertThat(result.get("dailyGoal")).isEqualTo(json("""
                {"minutesToday": 16, "goalMinutes": 10, "goalMet": true, "justMet": false}"""));
        assertThat(result.get("streak")).isEqualTo(json("""
                {"current": 1, "previous": 1, "extendedToday": true, "freezeUsed": false}"""));
    }

    @Test
    void aPlacementTestThatMeetsTheGoalAfterAMissedDayUsesTheStreakFreeze() {
        lessonOf(Duration.ofMinutes(11));
        clock.advance(DAY.multipliedBy(2));

        JsonNode result = placementOf(Duration.ofMinutes(12)).result();

        assertThat(result.get("dailyGoal").get("justMet").asBoolean()).isTrue();
        assertThat(result.get("streak")).isEqualTo(json("""
                {"current": 2, "previous": 1, "extendedToday": true, "freezeUsed": true}"""));
    }

    @Test
    void thePlacementResultReportsTheDayOfTheTestWhenReadLater() {
        PlacementDriver.Placement placement = placementOf(Duration.ofMinutes(12));
        clock.advance(DAY);

        MvcTestResult later = learner.get("/api/placement/" + placement.testId() + "/result");

        assertThat(later).hasStatusOk();
        JsonNode result = PlacementDriver.body(later);
        assertThat(result.get("dailyGoal")).isEqualTo(placement.result().get("dailyGoal"));
        assertThat(result.get("streak").get("extendedToday").asBoolean()).as("the streak as it stands today").isFalse();
    }

    @Test
    void aSkippedPlacementTestIsNoPractice() {
        String skipped = jdbc.sql("SELECT id FROM placement_tests WHERE status = 'skipped'").query(String.class).single();

        MvcTestResult result = learner.get("/api/placement/" + skipped + "/result");

        assertThat(result).hasStatusOk().bodyJson().extractingPath("$.dailyGoal").isEqualTo(Map.of(
                "minutesToday", 0, "goalMinutes", 10, "goalMet", false, "justMet", false));
        assertThat(result).bodyJson().extractingPath("$.streak").isEqualTo(Map.of(
                "current", 0, "previous", 0, "extendedToday", false, "freezeUsed", false));
    }

    @Test
    void completingALessonAgainOnALaterDayReportsItsOwnDay() {
        JsonNode lesson = lessons.start(LessonDriver.A0_WORDS);
        clock.advance(Duration.ofMinutes(11));
        lessons.answerAll(lesson, "ja");
        JsonNode first = lessons.complete(lesson);
        clock.advance(DAY);

        JsonNode again = lessons.complete(lesson);

        assertThat(again.get("dailyGoal")).isEqualTo(first.get("dailyGoal"));
        assertThat(again.get("dailyGoal").get("justMet").asBoolean()).isTrue();
        assertThat(again.get("streak").get("extendedToday").asBoolean()).as("the streak as it stands today").isFalse();
        assertThat(again.get("streak").get("previous").asInt()).as("its day is still the last of the streak").isZero();
    }

    @Test
    void aLessonCompletedAgainAfterALaterDayExtendedTheStreakShowsNoGrowth() {
        JsonNode lesson = lessons.start(LessonDriver.A0_WORDS);
        clock.advance(Duration.ofMinutes(11));
        lessons.answerAll(lesson, "ja");
        lessons.complete(lesson);
        clock.advance(DAY);
        lessonOf(Duration.ofMinutes(11));

        JsonNode again = lessons.complete(lesson);

        assertThat(again.get("streak")).isEqualTo(json("""
                {"current": 2, "previous": 2, "extendedToday": true, "freezeUsed": false}"""));
    }

    @Test
    void aLessonCompletedAgainAfterTheStreakEndedShowsNoStreak() {
        JsonNode lesson = lessons.start(LessonDriver.A0_WORDS);
        clock.advance(Duration.ofMinutes(11));
        lessons.answerAll(lesson, "ja");
        lessons.complete(lesson);
        clock.advance(DAY.multipliedBy(3));

        JsonNode again = lessons.complete(lesson);

        assertThat(again.get("streak")).isEqualTo(json("""
                {"current": 0, "previous": 0, "extendedToday": false, "freezeUsed": false}"""));
    }

    @Test
    void requiresASignedInLearner() {
        assertThat(new SpaClient(mvc).get("/api/progress/today")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    private JsonNode lessonOf(Duration duration) {
        JsonNode lesson = lessons.start(LessonDriver.A0_WORDS);
        clock.advance(duration);
        lessons.answerAll(lesson, "ja");
        return lessons.complete(lesson);
    }

    /** A placement test ("Neu einstufen") answered wrongly throughout, over {@code duration}. */
    private PlacementDriver.Placement placementOf(Duration duration) {
        PlacementDriver placement = new PlacementDriver(learner, jdbc);
        JsonNode started = placement.start();
        clock.advance(duration);
        return placement.finish(started, level -> false);
    }

    private JsonNode today() {
        MvcTestResult today = learner.get("/api/progress/today");
        assertThat(today).hasStatusOk();
        return PlacementDriver.body(today);
    }

    private void changeSettings(int dailyGoalMinutes, String timeZone) {
        assertThat(learner.put("/api/settings", """
                {"dailyGoalMinutes": %d, "requestRetention": 0.9, "timeZone": "%s"}""".formatted(dailyGoalMinutes, timeZone)))
                .hasStatusOk();
    }

    private static JsonNode json(String json) {
        return PlacementDriver.JSON.readTree(json);
    }
}
