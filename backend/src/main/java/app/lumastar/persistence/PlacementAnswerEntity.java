package app.lumastar.persistence;

import app.lumastar.domain.Competence;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.Level;
import app.lumastar.domain.Outcome;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** One evaluated answer of a placement test (PRD F2: the result is stored completely). */
@Entity
@Table(name = "placement_answers")
public class PlacementAnswerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    private UUID placementTestId;

    private int position;

    private String exerciseId;

    private Level level;

    private Competence competence;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> answer;

    private Outcome outcome;

    private ErrorCategory errorCategory;

    private int responseMs;

    private Instant answeredAt;

    protected PlacementAnswerEntity() {
    }

    /** {@code answer} is the answer as submitted, e.g. {@code {"choice": "faleminderit"}}. */
    public PlacementAnswerEntity(UUID userId, UUID placementTestId, int position, Exercise item, Map<String, Object> answer,
                                 Duration responseTime, EvaluationResult result, Instant answeredAt) {
        this.userId = userId;
        this.placementTestId = placementTestId;
        this.position = position;
        this.exerciseId = item.id();
        this.level = item.level();
        this.competence = item.competence();
        this.answer = Map.copyOf(answer);
        this.outcome = result.outcome();
        this.errorCategory = result.errorCategory();
        this.responseMs = Math.toIntExact(responseTime.toMillis());
        this.answeredAt = answeredAt;
    }
}
