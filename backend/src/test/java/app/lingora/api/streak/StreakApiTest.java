package app.lingora.api.streak;

import static app.lingora.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.ClockedIntegrationTest;
import app.lingora.LessonDriver;
import app.lingora.PlacementDriver;
import app.lingora.SpaClient;
import app.lingora.SyntheticContent;
import app.lingora.content.ContentSeeder;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/**
 * The streak screen and the streak goal (M10) across days, months and time zones, with the clock of the application
 * moved by the test. The learner starts on A0 with a daily goal of 10 minutes on Monday, 5 October 2026, in Zurich.
 */
class StreakApiTest extends ClockedIntegrationTest {

    private static final Duration DAY = Duration.ofDays(1);
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);
    private static final String GOAL = "/api/streak/goal";

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;
    private UUID learnerId;

    @BeforeEach
    void learnerOnA0OnMondayMorning() {
        clock.set(MONDAY_MORNING);
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(SyntheticContent.bundle());
        learner = new SpaClient(mvc);
        learnerId = learnerFor(learner, "Erza");
    }

    @Test
    void aNewLearnerHasNoStreakYetAndTheFirstGoalOfTenDays() {
        assertThat(learner.get("/api/streak")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"current": 0, "longest": 0, "extendedToday": false, "today": "2026-10-05", "minutesToday": 0,
                 "goalMinutes": 10,
                 "freezes": {"available": 1, "perWeek": 1, "resetsOn": "2026-10-12"},
                 "calendar": {"month": "2026-10", "firstDay": "2026-10-01", "days": []},
                 "goal": {"target": 10, "progress": 0, "reached": false, "options": []}}""");
    }

    @Test
    void requiresASignedInLearnerAndTheCsrfTokenToChooseAGoal() {
        SpaClient stranger = new SpaClient(mvc);
        stranger.get("/api/auth/status");

        assertProblem(stranger.get("/api/streak"), HttpStatus.UNAUTHORIZED, "authentication_required");
        assertProblem(stranger.put(GOAL, """
                {"target": 20}"""), HttpStatus.UNAUTHORIZED, "authentication_required");
        assertProblem(learner.putWithoutCsrfHeader(GOAL, """
                {"target": 20}"""), HttpStatus.FORBIDDEN, "csrf_invalid");
    }

    @Nested
    class Calendar {

        @Test
        void showsTheMetDaysAndTheDayTheFreezeBridgesWhileItBridgesIt() {
            lessonOf(Duration.ofMinutes(11));
            clock.advance(DAY.multipliedBy(2));

            JsonNode wednesday = streak("");
            lessonOf(Duration.ofMinutes(11));
            JsonNode extended = streak("");

            assertThat(wednesday.get("current").asInt()).isOne();
            assertThat(wednesday.get("calendar").get("days")).isEqualTo(json("""
                    [{"date": "2026-10-05", "status": "met"}, {"date": "2026-10-06", "status": "frozen"}]"""));
            assertThat(wednesday.get("freezes")).isEqualTo(json("""
                    {"available": 0, "perWeek": 1, "resetsOn": "2026-10-12", "lastUsedOn": "2026-10-06"}"""));
            assertThat(extended.get("current").asInt()).isEqualTo(2);
            assertThat(extended.get("extendedToday").asBoolean()).isTrue();
            assertThat(extended.get("calendar").get("days")).isEqualTo(json("""
                    [{"date": "2026-10-05", "status": "met"}, {"date": "2026-10-06", "status": "frozen"},
                     {"date": "2026-10-07", "status": "met"}]"""));
        }

        @Test
        void aBridgedDayThatIsNotCarriedOnDisappearsAndKeepsTheFreeze() {
            lessonOf(Duration.ofMinutes(11));
            clock.advance(DAY.multipliedBy(3));

            JsonNode thursday = streak("");

            assertThat(thursday.get("current").asInt()).isZero();
            assertThat(thursday.get("calendar").get("days")).isEqualTo(json("""
                    [{"date": "2026-10-05", "status": "met"}]"""));
            assertThat(thursday.get("freezes")).isEqualTo(json("""
                    {"available": 1, "perWeek": 1, "resetsOn": "2026-10-12"}"""));
        }

        @Test
        void aNewWeekBringsANewFreezeAndKeepsTheLastDayItWasUsed() {
            lessonOf(Duration.ofMinutes(11));
            clock.advance(DAY.multipliedBy(2));
            lessonOf(Duration.ofMinutes(11));
            clock.set(Instant.parse("2026-10-12T08:00:00Z"));

            JsonNode nextMonday = streak("");

            assertThat(nextMonday.get("freezes")).isEqualTo(json("""
                    {"available": 1, "perWeek": 1, "resetsOn": "2026-10-19", "lastUsedOn": "2026-10-06"}"""));
        }

        @Test
        void eachMonthShowsOnlyItsOwnDaysInTheLearnersTimeZone() {
            clock.set(Instant.parse("2026-10-30T10:00:00Z"));
            lessonOf(Duration.ofMinutes(11));
            clock.set(Instant.parse("2026-10-31T10:00:00Z"));
            lessonOf(Duration.ofMinutes(11));
            // 00:31 on 1 November in Zurich, still 31 October in New York
            clock.set(Instant.parse("2026-10-31T23:20:00Z"));
            lessonOf(Duration.ofMinutes(11));

            JsonNode current = streak("");
            JsonNode october = streak("?month=2026-10");
            JsonNode november = streak("?month=2026-11");

            assertThat(current.get("today").asString()).isEqualTo("2026-11-01");
            assertThat(current.get("current").asInt()).isEqualTo(3);
            assertThat(current.get("calendar")).isEqualTo(november.get("calendar"));
            assertThat(october.get("calendar")).isEqualTo(json("""
                    {"month": "2026-10", "firstDay": "2026-10-01",
                     "days": [{"date": "2026-10-30", "status": "met"}, {"date": "2026-10-31", "status": "met"}]}"""));
            assertThat(november.get("calendar")).isEqualTo(json("""
                    {"month": "2026-11", "firstDay": "2026-11-01", "days": [{"date": "2026-11-01", "status": "met"}]}"""));

            changeTimeZone("America/New_York");
            JsonNode newYork = streak("");

            assertThat(newYork.get("today").asString()).isEqualTo("2026-10-31");
            assertThat(newYork.get("calendar")).isEqualTo(october.get("calendar"));
        }

        @ParameterizedTest
        @ValueSource(strings = {"2026-09", "2025-10", "2026-12", "2031-01", "0001-01", "9999-12"})
        void monthsBeforeTheFirstStreakDayAndMonthsToComeHaveNoDays(String month) {
            lessonOf(Duration.ofMinutes(11));

            JsonNode calendar = streak("?month=" + month).get("calendar");

            assertThat(calendar.get("month").asString()).isEqualTo(month);
            assertThat(calendar.get("firstDay").asString()).isEqualTo(month + "-01");
            assertThat(calendar.get("days")).isEmpty();
        }

        @ParameterizedTest
        @ValueSource(strings = {"2026-13", "2026-00", "2026-1", "26-10", "2026-10-01", "Oktober", "+12026-10"})
        void rejectsAMonthNotOfTheFormYearDashMonth(String month) {
            assertProblem(learner.get("/api/streak?month=" + month), HttpStatus.BAD_REQUEST, "bad_request");
        }
    }

    @Nested
    class ReachingTheGoal {

        @Test
        void theLessonThatExtendsTheStreakToTheGoalCelebratesItWithTheNextOptions() {
            streakOf(9, MONDAY.minusDays(1));

            JsonNode result = lessonOf(Duration.ofMinutes(11));

            assertThat(result.get("streak")).isEqualTo(json("""
                    {"current": 10, "previous": 9, "extendedToday": true, "freezeUsed": false,
                     "goalReached": {"target": 10, "options": [20, 30, 50]}}"""));
            assertThat(streak("").get("goal")).isEqualTo(json("""
                    {"target": 10, "progress": 10, "reached": true, "options": [20, 30, 50]}"""));
            assertThat(jdbc.sql("SELECT reached_on FROM streak_goals").query(LocalDate.class).single()).isEqualTo(MONDAY);
            assertThat(jdbc.sql("SELECT reached_at FROM streak_goals").query(Instant.class).single())
                    .isEqualTo(MONDAY_MORNING.plus(Duration.ofMinutes(11)));
        }

        @Test
        void aLessonBeforeTheGoalIsReachedShowsTheGrowingStreakOnly() {
            streakOf(7, MONDAY.minusDays(1));

            JsonNode result = lessonOf(Duration.ofMinutes(11));

            assertThat(result.get("streak")).isEqualTo(json("""
                    {"current": 8, "previous": 7, "extendedToday": true, "freezeUsed": false}"""));
            assertThat(streak("").get("goal")).isEqualTo(json("""
                    {"target": 10, "progress": 8, "reached": false, "options": []}"""));
        }

        @Test
        void aStreakCarriedOverAFrozenDayReachesTheGoalToo() {
            streakOf(9, MONDAY.minusDays(2));

            JsonNode result = lessonOf(Duration.ofMinutes(11));

            assertThat(result.get("streak")).isEqualTo(json("""
                    {"current": 10, "previous": 9, "extendedToday": true, "freezeUsed": true,
                     "goalReached": {"target": 10, "options": [20, 30, 50]}}"""));
            assertThat(streak("").get("calendar").get("days").get(3)).isEqualTo(json("""
                    {"date": "2026-10-04", "status": "frozen"}"""));
        }

        @Test
        void aPlacementTestThatReachesTheGoalCelebratesItInItsResult() {
            streakOf(9, MONDAY.minusDays(1));
            PlacementDriver placement = new PlacementDriver(learner, jdbc);
            JsonNode started = placement.start();
            clock.advance(Duration.ofMinutes(12));

            JsonNode result = placement.finish(started, level -> false).result();

            assertThat(result.get("streak").get("previous").asInt()).isEqualTo(9);
            assertThat(result.get("streak").get("goalReached")).isEqualTo(json("""
                    {"target": 10, "options": [20, 30, 50]}"""));
        }

        @Test
        void completingTheLessonAgainShowsTheReachedGoalUntilTheNextGoalIsChosen() {
            streakOf(9, MONDAY.minusDays(1));
            LessonDriver lessons = new LessonDriver(learner);
            JsonNode lesson = lessons.start(LessonDriver.A0_WORDS);
            clock.advance(Duration.ofMinutes(11));
            lessons.answerAll(lesson, "ja");
            JsonNode first = lessons.complete(lesson);

            JsonNode again = lessons.complete(lesson);
            assertThat(learner.put(GOAL, """
                    {"target": 30}""")).hasStatusOk();
            JsonNode afterTheChoice = lessons.complete(lesson);

            assertThat(again.get("streak")).isEqualTo(first.get("streak"));
            assertThat(afterTheChoice.get("streak")).isEqualTo(json("""
                    {"current": 10, "previous": 9, "extendedToday": true, "freezeUsed": false}"""));
        }

        @Test
        void laterLessonsOfTheDayDoNotCelebrateTheGoalAgain() {
            streakOf(9, MONDAY.minusDays(1));
            lessonOf(Duration.ofMinutes(11));

            JsonNode later = lessonOf(Duration.ofMinutes(3));

            assertThat(later.get("streak")).isEqualTo(json("""
                    {"current": 10, "previous": 10, "extendedToday": true, "freezeUsed": false}"""));
        }

        @Test
        void aReachedGoalStaysReachedWhenTheStreakBreaksBeforeTheNextIsChosen() {
            streakOf(9, MONDAY.minusDays(1));
            lessonOf(Duration.ofMinutes(11));
            clock.advance(DAY.multipliedBy(3));

            JsonNode thursday = streak("");

            assertThat(thursday.get("current").asInt()).isZero();
            assertThat(thursday.get("goal")).isEqualTo(json("""
                    {"target": 10, "progress": 0, "reached": true, "options": [20, 30, 50]}"""));
        }

        @Test
        void aStreakLongerThanTheFirstGoalFromBeforeGoalsExistedOffersTheRungsAheadOfIt() {
            streakOf(15, MONDAY.minusDays(1));

            JsonNode before = streak("");
            JsonNode result = lessonOf(Duration.ofMinutes(11));

            assertThat(before.get("goal")).isEqualTo(json("""
                    {"target": 10, "progress": 10, "reached": true, "options": [20, 30, 50]}"""));
            assertThat(result.get("streak").get("goalReached")).isEqualTo(json("""
                    {"target": 10, "options": [20, 30, 50]}"""));
        }
    }

    @Nested
    class ChoosingTheGoal {

        @Test
        void aReachedGoalIsReplacedByOneOfItsOptionsWhoseProgressGoesOn() {
            streakOf(9, MONDAY.minusDays(1));
            lessonOf(Duration.ofMinutes(11));

            MvcTestResult chosen = learner.put(GOAL, """
                    {"target": 30}""");
            clock.advance(DAY);
            lessonOf(Duration.ofMinutes(11));

            assertThat(chosen).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                    {"target": 30, "progress": 10, "reached": false, "options": []}""");
            assertThat(streak("").get("goal")).isEqualTo(json("""
                    {"target": 30, "progress": 11, "reached": false, "options": []}"""));
            assertThat(jdbc.sql("SELECT target || '|' || (reached_on IS NULL) || '|' || (reached_at IS NULL) FROM streak_goals")
                    .query(String.class).single()).isEqualTo("30|true|true");
        }

        @ParameterizedTest
        @ValueSource(ints = {10, 75, 100, 25, 0, -20})
        void aReachedGoalAcceptsOnlyItsOptions(int target) {
            streakOf(9, MONDAY.minusDays(1));
            lessonOf(Duration.ofMinutes(11));

            MvcTestResult refused = learner.put(GOAL, """
                    {"target": %d}""".formatted(target));

            assertProblem(refused, HttpStatus.BAD_REQUEST, "invalid_streak_goal");
            assertThat(refused).bodyJson().extractingPath("$.detail").asString().contains("[20, 30, 50]");
            assertThat(streak("").get("goal").get("reached").asBoolean()).isTrue();
        }

        @Test
        void beforeItIsReachedTheGoalCanBeChangedToAnyRungAboveTheStreak() {
            streakOf(5, MONDAY.minusDays(1));

            assertThat(learner.put(GOAL, """
                    {"target": 50}""")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                    {"target": 50, "progress": 5, "reached": false, "options": []}""");
            assertThat(learner.put(GOAL, """
                    {"target": 20}""")).hasStatusOk();
            assertThat(learner.put(GOAL, """
                    {"target": 10}""")).hasStatusOk();
            assertThat(streak("").get("goal").get("target").asInt()).isEqualTo(10);
        }

        @ParameterizedTest
        @ValueSource(ints = {10, 20, 25, 0, 366})
        void beforeItIsReachedTheGoalRefusesRungsUpToTheStreakAndLengthsOffTheLadder(int target) {
            streakOf(20, MONDAY.minusDays(1));
            jdbc.sql("INSERT INTO streak_goals (user_id, target, updated_at) VALUES (:user, 30, now())")
                    .param("user", learnerId).update();

            assertProblem(learner.put(GOAL, """
                    {"target": %d}""".formatted(target)), HttpStatus.BAD_REQUEST, "invalid_streak_goal");
            assertThat(streak("").get("goal").get("target").asInt()).isEqualTo(30);
        }

        @Test
        void requiresATarget() {
            MvcTestResult refused = learner.put(GOAL, "{}");

            assertProblem(refused, HttpStatus.BAD_REQUEST, "validation_failed");
            assertThat(refused).bodyJson().extractingPath("$.errors[0].field").isEqualTo("target");
        }

        @Test
        void aBrokenStreakKeepsTheGoalAndStartsItsProgressAgain() {
            streakOf(5, MONDAY.minusDays(1));
            assertThat(learner.put(GOAL, """
                    {"target": 20}""")).hasStatusOk();
            clock.advance(DAY.multipliedBy(2));

            JsonNode broken = streak("");
            lessonOf(Duration.ofMinutes(11));

            assertThat(broken.get("goal")).isEqualTo(json("""
                    {"target": 20, "progress": 0, "reached": false, "options": []}"""));
            assertThat(streak("").get("goal")).isEqualTo(json("""
                    {"target": 20, "progress": 1, "reached": false, "options": []}"""));
        }
    }

    @Test
    void theStreakAndTheGoalOfOneLearnerNeverShowInThoseOfAnother() {
        SpaClient other = new SpaClient(mvc);
        learnerFor(other, "Arta");
        JsonNode otherBefore = PlacementDriver.body(other.get("/api/streak"));
        streakOf(9, MONDAY.minusDays(1));

        lessonOf(Duration.ofMinutes(11));
        assertThat(learner.put(GOAL, """
                {"target": 50}""")).hasStatusOk();

        assertThat(PlacementDriver.body(other.get("/api/streak"))).isEqualTo(otherBefore);
        assertThat(PlacementDriver.body(other.put(GOAL, """
                {"target": 20}"""))).isEqualTo(json("""
                {"target": 20, "progress": 0, "reached": false, "options": []}"""));
        assertThat(streak("").get("goal")).isEqualTo(json("""
                {"target": 50, "progress": 10, "reached": false, "options": []}"""));
    }

    /** Registers and places the learner on A0. */
    private UUID learnerFor(SpaClient client, String displayName) {
        String email = client.register(displayName);
        new PlacementDriver(client, jdbc).answerOnboarding("nothing");
        assertThat(client.post("/api/placement/skip", "")).hasStatusOk();
        return jdbc.sql("SELECT id FROM users WHERE email = :email").param("email", email).query(UUID.class).single();
    }

    /** A streak of {@code days} days with the goal met, the last of them {@code lastDay}. */
    private void streakOf(int days, LocalDate lastDay) {
        jdbc.sql("""
                        INSERT INTO streaks (user_id, current_days, longest_days, last_active_date, updated_at)
                        VALUES (:user, :days, :days, :lastDay, now())""")
                .param("user", learnerId).param("days", days).param("lastDay", lastDay).update();
        jdbc.sql("""
                        INSERT INTO streak_days (user_id, day, kind, goal_minutes, recorded_at)
                        SELECT :user, day::date, 'goal_met', 10, now()
                        FROM generate_series(CAST(:firstDay AS date), CAST(:lastDay AS date), interval '1 day') day""")
                .param("user", learnerId).param("firstDay", lastDay.minusDays(days - 1)).param("lastDay", lastDay).update();
    }

    private JsonNode lessonOf(Duration duration) {
        LessonDriver lessons = new LessonDriver(learner);
        JsonNode lesson = lessons.start(LessonDriver.A0_WORDS);
        clock.advance(duration);
        lessons.answerAll(lesson, "ja");
        return lessons.complete(lesson);
    }

    private JsonNode streak(String query) {
        MvcTestResult streak = learner.get("/api/streak" + query);
        assertThat(streak).hasStatusOk();
        return PlacementDriver.body(streak);
    }

    private void changeTimeZone(String timeZone) {
        assertThat(learner.put("/api/settings", """
                {"dailyGoalMinutes": 10, "requestRetention": 0.9, "timeZone": "%s"}""".formatted(timeZone))).hasStatusOk();
    }

    private static JsonNode json(String json) {
        return PlacementDriver.JSON.readTree(json);
    }
}
