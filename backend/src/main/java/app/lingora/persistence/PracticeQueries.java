package app.lingora.persistence;

import app.lingora.core.progress.PracticeTime;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Practice per day of the learner's time zone (PRD F9 daily goal, F10 heatmap): completed lessons of every kind and
 * completed placement tests, each by the day it was completed, with its duration counted as {@link PracticeTime} does.
 * Only lessons earn XP and count as lessons.
 */
@Repository
public class PracticeQueries {

    private static final String PRACTICE_PER_DAY = """
            WITH practice AS (
                SELECT started_at, finished_at, xp_earned AS xp, 1 AS lessons FROM sessions
                WHERE user_id = :user AND finished_at >= :from AND finished_at < :to AND finished_at <= :until
                UNION ALL
                SELECT started_at, finished_at, 0, 0 FROM placement_tests
                WHERE user_id = :user AND status = 'completed'
                  AND finished_at >= :from AND finished_at < :to AND finished_at <= :until
            )
            SELECT (finished_at AT TIME ZONE :zone)::date AS day,
                   sum(greatest(0, least(extract(epoch FROM finished_at - started_at) * 1000, :maxMs)))::bigint AS practised_ms,
                   sum(xp)::integer AS xp, sum(lessons)::integer AS lessons
            FROM practice
            GROUP BY day
            ORDER BY day""";

    private final JdbcClient jdbc;

    public PracticeQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record DayPractice(LocalDate day, Duration practised, int xp, int lessons) {

        public static DayPractice none(LocalDate day) {
            return new DayPractice(day, Duration.ZERO, 0, 0);
        }
    }

    /** The days within {@code [from, to]} with practice, in date order. */
    public List<DayPractice> perDay(UUID userId, LocalDate from, LocalDate to, ZoneId zone) {
        return query(userId, from, to, zone, startOf(to.plusDays(1), zone));
    }

    public DayPractice on(UUID userId, LocalDate day, ZoneId zone) {
        return onUntil(userId, day, zone, startOf(day.plusDays(1), zone));
    }

    /** The practice of {@code day} completed at or before {@code until}, e.g. up to a given lesson. */
    public DayPractice onUntil(UUID userId, LocalDate day, ZoneId zone, Instant until) {
        return query(userId, day, day, zone, until).stream().findFirst().orElseGet(() -> DayPractice.none(day));
    }

    private List<DayPractice> query(UUID userId, LocalDate from, LocalDate to, ZoneId zone, Instant until) {
        return jdbc.sql(PRACTICE_PER_DAY)
                .param("user", userId)
                .param("from", SqlTimestamps.of(startOf(from, zone)))
                .param("to", SqlTimestamps.of(startOf(to.plusDays(1), zone)))
                .param("until", SqlTimestamps.of(until))
                .param("zone", zone.getId())
                .param("maxMs", PracticeTime.MAX_PER_SESSION.toMillis())
                .query(PracticeQueries::dayPractice)
                .list();
    }

    private static Instant startOf(LocalDate day, ZoneId zone) {
        return day.atStartOfDay(zone).toInstant();
    }

    private static DayPractice dayPractice(ResultSet row, int rowNumber) throws SQLException {
        return new DayPractice(row.getObject("day", LocalDate.class), Duration.ofMillis(row.getLong("practised_ms")),
                row.getInt("xp"), row.getInt("lessons"));
    }
}
