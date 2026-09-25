package app.lingora.persistence;

import app.lingora.core.lesson.XpCalculator.LessonXp;
import app.lingora.domain.Level;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** One lesson of the learner, from its composition to its result (table {@code sessions}, not HTTP sessions). */
@Entity
@Table(name = "sessions")
public class LessonSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    private SessionKind kind;

    private String unitId;

    private Level level;

    private String composedBy;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> exerciseIds;

    private Instant startedAt;

    private Instant finishedAt;

    private Integer exerciseCount;

    private Integer correctCount;

    private BigDecimal accuracy;

    private int xpEarned;

    private int xpBase;

    private int xpPerfectBonus;

    private int xpSpeedBonus;

    protected LessonSessionEntity() {
    }

    public LessonSessionEntity(UUID userId, String unitId, Level level, List<String> exerciseIds, String composedBy,
                               Instant startedAt) {
        this.userId = userId;
        this.kind = SessionKind.LESSON;
        this.unitId = unitId;
        this.level = level;
        this.exerciseIds = List.copyOf(exerciseIds);
        this.composedBy = composedBy;
        this.startedAt = startedAt;
    }

    /** Records the result of the lesson; {@code accuracy} counts first attempts only. */
    public void finish(Instant at, int correct, BigDecimal accuracyOfFirstAttempts, LessonXp xp) {
        finishedAt = at;
        exerciseCount = exerciseIds.size();
        correctCount = correct;
        accuracy = accuracyOfFirstAttempts;
        xpBase = xp.base();
        xpPerfectBonus = xp.perfectBonus();
        xpSpeedBonus = xp.speedBonus();
        xpEarned = xp.total();
    }

    public boolean isFinished() {
        return finishedAt != null;
    }

    public boolean contains(String exerciseId) {
        return exerciseIds.contains(exerciseId);
    }

    public Duration duration() {
        return Duration.between(startedAt, finishedAt);
    }

    public UUID getId() {
        return id;
    }

    public String getUnitId() {
        return unitId;
    }

    public List<String> getExerciseIds() {
        return exerciseIds;
    }

    public Integer getCorrectCount() {
        return correctCount;
    }

    public BigDecimal getAccuracy() {
        return accuracy;
    }

    public LessonXp xp() {
        return new LessonXp(xpBase, xpPerfectBonus, xpSpeedBonus);
    }
}
