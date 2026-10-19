package app.lumastar.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import app.lumastar.IntegrationTest;
import app.lumastar.LearnerFixture;
import app.lumastar.persistence.PracticeQueries.DayPractice;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Practice per day of the learner's time zone, around midnight and the DST changes of Zurich. */
class PracticeQueriesTest extends IntegrationTest {

    private static final ZoneId ZURICH = ZoneId.of("Europe/Zurich");

    @Autowired
    private PracticeQueries practice;

    private UUID learner;

    @BeforeEach
    void learnerWithoutPractice() {
        jdbc.sql("DELETE FROM users").update();
        learner = new LearnerFixture(jdbc).learner("Erza");
    }

    @Test
    void countsEveryLessonOnTheDayItWasCompletedInTheLearnersTimeZone() {
        lesson("2026-10-05T21:20:00Z", Duration.ofMinutes(6), 15);
        lesson("2026-10-05T22:10:00Z", Duration.ofMinutes(4), 20);

        assertThat(practice.perDay(learner, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 10), ZURICH)).containsExactly(
                new DayPractice(LocalDate.of(2026, 10, 5), Duration.ofMinutes(6), 15, 1),
                new DayPractice(LocalDate.of(2026, 10, 6), Duration.ofMinutes(4), 20, 1));
        assertThat(practice.on(learner, LocalDate.of(2026, 10, 5), ZoneId.of("America/New_York")))
                .isEqualTo(new DayPractice(LocalDate.of(2026, 10, 5), Duration.ofMinutes(10), 35, 2));
    }

    @Test
    void theDayDaylightSavingTimeEndsHas25Hours() {
        lesson("2026-10-24T21:30:00Z", Duration.ofMinutes(1), 0);
        lesson("2026-10-24T22:30:00Z", Duration.ofMinutes(2), 0);
        lesson("2026-10-25T22:30:00Z", Duration.ofMinutes(3), 0);
        lesson("2026-10-25T23:30:00Z", Duration.ofMinutes(4), 0);

        assertThat(practice.perDay(learner, LocalDate.of(2026, 10, 24), LocalDate.of(2026, 10, 26), ZURICH))
                .extracting(DayPractice::day, DayPractice::practised)
                .containsExactly(
                        tuple(LocalDate.of(2026, 10, 24), Duration.ofMinutes(1)),
                        tuple(LocalDate.of(2026, 10, 25), Duration.ofMinutes(5)),
                        tuple(LocalDate.of(2026, 10, 26), Duration.ofMinutes(4)));
    }

    @Test
    void theDayDaylightSavingTimeStartsHas23Hours() {
        lesson("2026-03-28T22:30:00Z", Duration.ofMinutes(1), 0);
        lesson("2026-03-28T23:30:00Z", Duration.ofMinutes(2), 0);
        lesson("2026-03-29T21:30:00Z", Duration.ofMinutes(3), 0);
        lesson("2026-03-29T22:30:00Z", Duration.ofMinutes(4), 0);

        assertThat(practice.on(learner, LocalDate.of(2026, 3, 29), ZURICH).practised()).isEqualTo(Duration.ofMinutes(5));
        assertThat(practice.on(learner, LocalDate.of(2026, 3, 30), ZURICH).practised()).isEqualTo(Duration.ofMinutes(4));
    }

    @Test
    void countsALessonLeftOpenWithThirtyMinutes() {
        lesson("2026-10-05T12:00:00Z", Duration.ofHours(4), 20);
        lesson("2026-10-05T13:00:00Z", Duration.ofSeconds(90), 15);

        assertThat(practice.on(learner, LocalDate.of(2026, 10, 5), ZURICH))
                .isEqualTo(new DayPractice(LocalDate.of(2026, 10, 5), Duration.ofSeconds(1890), 35, 2));
    }

    @Test
    void countsCompletedPlacementTestsButNeitherRunningLessonsNorSkippedTests() {
        placementTest("completed", "2026-10-05T09:00:00Z", Duration.ofMinutes(7));
        placementTest("skipped", "2026-10-05T10:00:00Z", Duration.ofMinutes(1));
        placementTest("abandoned", "2026-10-05T11:00:00Z", Duration.ofMinutes(3));
        new LearnerFixture(jdbc).lesson(learner, null, Instant.parse("2026-10-05T12:00:00Z"));

        assertThat(practice.on(learner, LocalDate.of(2026, 10, 5), ZURICH))
                .isEqualTo(new DayPractice(LocalDate.of(2026, 10, 5), Duration.ofMinutes(7), 0, 0));
    }

    @Test
    void countsTheDayUpToAGivenTime() {
        lesson("2026-10-05T08:00:00Z", Duration.ofMinutes(6), 15);
        lesson("2026-10-05T09:00:00Z", Duration.ofMinutes(5), 20);
        lesson("2026-10-05T10:00:00Z", Duration.ofMinutes(4), 20);

        assertThat(practice.onUntil(learner, LocalDate.of(2026, 10, 5), ZURICH, Instant.parse("2026-10-05T09:00:00Z")))
                .isEqualTo(new DayPractice(LocalDate.of(2026, 10, 5), Duration.ofMinutes(11), 35, 2));
        assertThat(practice.on(learner, LocalDate.of(2026, 10, 4), ZURICH))
                .isEqualTo(DayPractice.none(LocalDate.of(2026, 10, 4)));
    }

    private void lesson(String finishedAt, Duration duration, int xp) {
        Instant end = Instant.parse(finishedAt);
        jdbc.sql("""
                        INSERT INTO sessions (user_id, kind, level, composed_by, started_at, finished_at, exercise_count,
                                              correct_count, accuracy, xp_base, xp_earned)
                        VALUES (:user, 'review', 'A1.1', 'rule_based_v1', :start, :end, 3, 3, 1, :xp, :xp)""")
                .param("user", learner)
                .param("start", SqlTimestamps.of(end.minus(duration)))
                .param("end", SqlTimestamps.of(end))
                .param("xp", xp)
                .update();
    }

    private void placementTest(String status, String finishedAt, Duration duration) {
        Instant end = Instant.parse(finishedAt);
        jdbc.sql("""
                        INSERT INTO placement_tests (user_id, status, engine, start_level, current_level, result_level,
                                                     started_at, finished_at)
                        VALUES (:user, :status, 'rule_based_v1', 'A0', 'A0', 'A0', :start, :end)""")
                .param("user", learner)
                .param("status", status)
                .param("start", SqlTimestamps.of(end.minus(duration)))
                .param("end", SqlTimestamps.of(end))
                .update();
    }
}
