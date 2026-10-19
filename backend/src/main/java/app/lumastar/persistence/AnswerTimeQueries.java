package app.lumastar.persistence;

import app.lumastar.domain.ExerciseType;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Response times of recorded answers, the learner's own measure of a slow or fast answer (PRD F8). */
@Repository
public class AnswerTimeQueries {

    private final JdbcClient jdbc;

    public AnswerTimeQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The response times of the latest first attempts of the type, newest first, leaving out {@code exceptAttempt}. */
    public List<Duration> recentFirstAttempts(UUID userId, ExerciseType type, int limit, UUID exceptAttempt) {
        return jdbc.sql("""
                        SELECT response_ms FROM attempts
                        WHERE user_id = :user AND exercise_type = :type AND NOT is_retry AND id <> :attempt
                        ORDER BY answered_at DESC
                        LIMIT :limit""")
                .param("user", userId)
                .param("type", type.code())
                .param("attempt", exceptAttempt)
                .param("limit", limit)
                .query((row, rowNumber) -> Duration.ofMillis(row.getInt("response_ms")))
                .list();
    }
}
