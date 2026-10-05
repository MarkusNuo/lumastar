package app.lingora.persistence;

import app.lingora.core.progress.Streak;
import app.lingora.domain.Coded;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Tables {@code streaks} and {@code streak_days} (PRD F9): the state of the learner's streak and the days that
 * counted for it.
 */
@Repository
public class StreakStore {

    private static final String STREAK_COLUMNS =
            "current_days, longest_days, last_active_date, freezes_refilled_on, freezes_available";

    private final JdbcClient jdbc;

    public StreakStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * A day that counted for the streak; {@code goalMinutes} is set for a met goal only, and {@code metBy} is
     * {@link PracticeCompletion#NONE} unless the completion of a lesson or a placement test met it.
     */
    public record StreakDay(LocalDate day, StreakDayKind kind, Integer goalMinutes, PracticeCompletion metBy) {
    }

    public Streak streak(UUID userId) {
        return jdbc.sql("SELECT %s FROM streaks WHERE user_id = :user".formatted(STREAK_COLUMNS))
                .param("user", userId)
                .query(StreakStore::streak)
                .optional()
                .orElse(Streak.NONE);
    }

    /**
     * The learner's streak, locked until the end of the transaction so that concurrent lesson completions extend it
     * one after another; a missing row is created first.
     */
    public Streak lock(UUID userId, Instant at) {
        jdbc.sql("""
                        INSERT INTO streaks (user_id, updated_at) VALUES (:user, :at)
                        ON CONFLICT (user_id) DO NOTHING""")
                .param("user", userId)
                .param("at", SqlTimestamps.of(at))
                .update();
        return jdbc.sql("SELECT %s FROM streaks WHERE user_id = :user FOR UPDATE".formatted(STREAK_COLUMNS))
                .param("user", userId)
                .query(StreakStore::streak)
                .single();
    }

    public void save(UUID userId, Streak streak, Instant at) {
        jdbc.sql("""
                        UPDATE streaks
                        SET current_days = :current, longest_days = :longest, last_active_date = :lastActive,
                            freezes_refilled_on = :freezeWeek, freezes_available = :freezesLeft, updated_at = :at
                        WHERE user_id = :user""")
                .param("current", streak.current())
                .param("longest", streak.longest())
                .param("lastActive", streak.lastActiveDate())
                .param("freezeWeek", streak.freezeWeek())
                .param("freezesLeft", streak.freezesLeftInWeek())
                .param("at", SqlTimestamps.of(at))
                .param("user", userId)
                .update();
    }

    public void recordGoalMet(UUID userId, LocalDate day, int goalMinutes, PracticeCompletion metBy, Instant at) {
        record(userId, new StreakDay(day, StreakDayKind.GOAL_MET, goalMinutes, metBy), at);
    }

    public void recordFreeze(UUID userId, LocalDate day, Instant at) {
        record(userId, new StreakDay(day, StreakDayKind.FREEZE, null, PracticeCompletion.NONE), at);
    }

    /** The recorded days within {@code [from, to]}, in date order. */
    public List<StreakDay> days(UUID userId, LocalDate from, LocalDate to) {
        return jdbc.sql("""
                        SELECT day, kind, goal_minutes, session_id, placement_test_id FROM streak_days
                        WHERE user_id = :user AND day BETWEEN :from AND :to
                        ORDER BY day""")
                .param("user", userId)
                .param("from", from)
                .param("to", to)
                .query(StreakStore::streakDay)
                .list();
    }

    /** The day whose goal the completion met, if it did. */
    public Optional<LocalDate> dayMetBy(UUID userId, PracticeCompletion completion) {
        return jdbc.sql("""
                        SELECT day FROM streak_days
                        WHERE user_id = :user AND (session_id = :session OR placement_test_id = :placementTest)""")
                .param("user", userId)
                .param("session", completion.sessionId())
                .param("placementTest", completion.placementTestId())
                .query(LocalDate.class)
                .optional();
    }

    private void record(UUID userId, StreakDay day, Instant at) {
        jdbc.sql("""
                        INSERT INTO streak_days (user_id, day, kind, goal_minutes, session_id, placement_test_id, recorded_at)
                        VALUES (:user, :day, :kind, :goalMinutes, :session, :placementTest, :at)""")
                .param("user", userId)
                .param("day", day.day())
                .param("kind", day.kind().code())
                .param("goalMinutes", day.goalMinutes())
                .param("session", day.metBy().sessionId())
                .param("placementTest", day.metBy().placementTestId())
                .param("at", SqlTimestamps.of(at))
                .update();
    }

    private static Streak streak(ResultSet row, int rowNumber) throws SQLException {
        return new Streak(row.getInt("current_days"), row.getInt("longest_days"),
                row.getObject("last_active_date", LocalDate.class), row.getObject("freezes_refilled_on", LocalDate.class),
                row.getInt("freezes_available"));
    }

    private static StreakDay streakDay(ResultSet row, int rowNumber) throws SQLException {
        return new StreakDay(row.getObject("day", LocalDate.class),
                Coded.fromCode(StreakDayKind.class, row.getString("kind")), row.getObject("goal_minutes", Integer.class),
                new PracticeCompletion(row.getObject("session_id", UUID.class), row.getObject("placement_test_id", UUID.class)));
    }
}
