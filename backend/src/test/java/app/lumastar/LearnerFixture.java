package app.lumastar;

import app.lumastar.persistence.SqlTimestamps;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Inserts synthetic learner data directly, for tests that need answers at chosen times. */
public final class LearnerFixture {

    private final JdbcClient jdbc;

    public LearnerFixture(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public UUID learner(String displayName) {
        return jdbc.sql("INSERT INTO users (display_name, password_hash) VALUES (:name, 'not-a-real-hash') RETURNING id")
                .param("name", displayName)
                .query(UUID.class)
                .single();
    }

    public UUID lesson(UUID userId, String unitId, Instant startedAt) {
        return jdbc.sql("""
                        INSERT INTO sessions (user_id, kind, unit_id, level, composed_by, exercise_ids, started_at)
                        VALUES (:user, 'lesson', :unit, 'A1.1', 'rule_based_v1', '{}', :startedAt)
                        RETURNING id""")
                .param("user", userId)
                .param("unit", unitId)
                .param("startedAt", SqlTimestamps.of(startedAt))
                .query(UUID.class)
                .single();
    }

    /** An answer as the lesson API records it; {@code category} and {@code expected} may be {@code null}. */
    public record Answer(String exerciseId, String exerciseType, List<String> skillTags, String answerJson, String outcome,
                         String category, String expected, boolean retry, Instant answeredAt) {
    }

    public void answer(UUID userId, UUID lesson, Answer answer) {
        jdbc.sql("""
                        INSERT INTO attempts (user_id, session_id, position, exercise_id, exercise_type, skill_tags, is_retry,
                                              answer, outcome, error_category, fsrs_rating, response_ms, evaluated_by,
                                              answered_at, expected)
                        VALUES (:user, :lesson, (SELECT count(*) + 1 FROM attempts WHERE session_id = :lesson), :exercise,
                                :type, :tags, :retry, :answer::jsonb, :outcome, :category, :rating, 4000, 'rule_based_v1',
                                :answeredAt, :expected)""")
                .param("user", userId)
                .param("lesson", lesson)
                .param("exercise", answer.exerciseId())
                .param("type", answer.exerciseType())
                .param("tags", answer.skillTags().toArray(String[]::new))
                .param("retry", answer.retry())
                .param("answer", answer.answerJson())
                .param("outcome", answer.outcome())
                .param("category", answer.category())
                .param("rating", answer.outcome().equals("wrong") ? "again" : "good")
                .param("answeredAt", SqlTimestamps.of(answer.answeredAt()))
                .param("expected", answer.expected())
                .update();
    }
}
