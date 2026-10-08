package app.lingora.persistence;

import app.lingora.core.progress.StreakGoal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Table {@code streak_goals}: the learner's streak goal, {@link StreakGoal#FIRST} until the first change. */
@Repository
public class StreakGoalStore {

    private final JdbcClient jdbc;

    public StreakGoalStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public StreakGoal goal(UUID userId) {
        return jdbc.sql("SELECT target, reached_on FROM streak_goals WHERE user_id = :user")
                .param("user", userId)
                .query((row, rowNumber) -> new StreakGoal(row.getInt("target"), row.getObject("reached_on", LocalDate.class)))
                .optional()
                .orElse(StreakGoal.FIRST);
    }

    public void choose(UUID userId, int target, Instant at) {
        save(userId, StreakGoal.chosen(target), null, at);
    }

    public void markReached(UUID userId, StreakGoal reached, Instant at) {
        save(userId, reached, at, at);
    }

    private void save(UUID userId, StreakGoal goal, Instant reachedAt, Instant at) {
        jdbc.sql("""
                        INSERT INTO streak_goals (user_id, target, reached_on, reached_at, updated_at)
                        VALUES (:user, :target, :reachedOn, :reachedAt, :at)
                        ON CONFLICT (user_id) DO UPDATE
                        SET target = excluded.target, reached_on = excluded.reached_on, reached_at = excluded.reached_at,
                            updated_at = excluded.updated_at""")
                .param("user", userId)
                .param("target", goal.target())
                .param("reachedOn", goal.reachedOn())
                .param("reachedAt", SqlTimestamps.of(reachedAt))
                .param("at", SqlTimestamps.of(at))
                .update();
    }
}
