package app.lumastar.persistence;

import app.lumastar.core.lesson.XpCalculator.LessonXp;
import app.lumastar.domain.Level;
import app.lumastar.domain.SkillTag;
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

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> focusSkillTags;

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

    private Boolean checkpointPassed;

    protected LessonSessionEntity() {
    }

    public LessonSessionEntity(UUID userId, String unitId, Level level, List<String> exerciseIds, String composedBy,
                               Instant startedAt) {
        this.userId = userId;
        this.kind = SessionKind.LESSON;
        this.unitId = unitId;
        this.level = level;
        this.focusSkillTags = List.of();
        this.exerciseIds = List.copyOf(exerciseIds);
        this.composedBy = composedBy;
        this.startedAt = startedAt;
    }

    /** A focus lesson on a weak skill tag (PRD F3, F7); it belongs to no unit of the curriculum. */
    public static LessonSessionEntity focus(UUID userId, SkillTag tag, Level level, List<String> exerciseIds, String composedBy,
                                            Instant startedAt) {
        LessonSessionEntity session = new LessonSessionEntity(userId, null, level, exerciseIds, composedBy, startedAt);
        session.kind = SessionKind.FOCUS;
        session.focusSkillTags = List.of(tag.id());
        return session;
    }

    /** A lesson on a skill tag the learner chose to practise (PRD F10 "Gezielt üben"); it belongs to no unit. */
    public static LessonSessionEntity practice(UUID userId, SkillTag tag, Level level, List<String> exerciseIds,
                                               String composedBy, Instant startedAt) {
        LessonSessionEntity session = focus(userId, tag, level, exerciseIds, composedBy, startedAt);
        session.kind = SessionKind.PRACTICE;
        return session;
    }

    /** A review lesson of due items (PRD F8); it belongs to no unit. {@code level} is {@code null} before the placement. */
    public static LessonSessionEntity review(UUID userId, Level level, List<String> exerciseIds, String composedBy,
                                             Instant startedAt) {
        LessonSessionEntity session = new LessonSessionEntity(userId, null, level, exerciseIds, composedBy, startedAt);
        session.kind = SessionKind.REVIEW;
        return session;
    }

    /** The checkpoint at the end of the stage {@code level} (PRD chapter 5). */
    public static LessonSessionEntity checkpoint(UUID userId, Level level, List<String> exerciseIds, String composedBy,
                                                 Instant startedAt) {
        LessonSessionEntity session = new LessonSessionEntity(userId, null, level, exerciseIds, composedBy, startedAt);
        session.kind = SessionKind.CHECKPOINT;
        return session;
    }

    /** Records whether the finished checkpoint was passed. */
    public void recordCheckpoint(boolean passed) {
        if (kind != SessionKind.CHECKPOINT || !isFinished()) {
            throw new IllegalStateException("only a finished checkpoint has a result");
        }
        checkpointPassed = passed;
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

    public SessionKind getKind() {
        return kind;
    }

    /** {@code null} while the lesson is running. */
    public Instant getFinishedAt() {
        return finishedAt;
    }

    public Level getLevel() {
        return level;
    }

    /** {@code null} unless the session is a finished checkpoint. */
    public Boolean getCheckpointPassed() {
        return checkpointPassed;
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
