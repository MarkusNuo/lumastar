package app.lingora.persistence;

import app.lingora.domain.ErrorCategory;
import app.lingora.domain.EvaluationResult;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.Outcome;
import app.lingora.domain.Rating;
import app.lingora.domain.SkillTag;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** One evaluated answer within a lesson (PRD F6 error logging). The column {@code is_correct} is derived by the database. */
@Entity
@Table(name = "attempts")
public class AttemptEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    private UUID sessionId;

    private int position;

    private String exerciseId;

    private ExerciseType exerciseType;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> skillTags;

    @Column(name = "is_retry")
    private boolean retry;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> answer;

    private Outcome outcome;

    private ErrorCategory errorCategory;

    private Rating fsrsRating;

    private int responseMs;

    private String evaluatedBy;

    private Instant answeredAt;

    private String expected;

    protected AttemptEntity() {
    }

    /** {@code answer} is the answer as submitted, e.g. {@code {"text": "Shpija âsht e madhe."}}. */
    public AttemptEntity(UUID userId, UUID sessionId, int position, Exercise exercise, boolean retry,
                         Map<String, Object> answer, Duration responseTime, EvaluationResult result, String evaluatedBy,
                         Instant answeredAt) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.position = position;
        this.exerciseId = exercise.id();
        this.exerciseType = exercise.type();
        this.skillTags = exercise.skillTags().stream().map(SkillTag::id).toList();
        this.retry = retry;
        this.answer = Map.copyOf(answer);
        this.outcome = result.outcome();
        this.errorCategory = result.errorCategory();
        this.fsrsRating = result.rating();
        this.responseMs = Math.toIntExact(responseTime.toMillis());
        this.evaluatedBy = evaluatedBy;
        this.answeredAt = answeredAt;
        this.expected = result.solution();
    }

    public String getExerciseId() {
        return exerciseId;
    }

    public boolean countsAsCorrect() {
        return outcome.isAccepted();
    }

    public Duration responseTime() {
        return Duration.ofMillis(responseMs);
    }
}
