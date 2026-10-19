package app.lumastar.persistence;

import app.lumastar.domain.Competence;
import app.lumastar.domain.Level;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.PlacementResult;
import app.lumastar.domain.PlacementResult.CompetenceScore;
import app.lumastar.domain.PlacementState;
import app.lumastar.domain.SkillTag;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One placement test (PRD F2). {@code state} is the engine state with the item shown next; {@code result} holds the
 * initial mastery, strengths, weaknesses and competence scores once the test is completed.
 */
@Entity
@Table(name = "placement_tests")
public class PlacementTestEntity {

    /** JSON of {@code state}; enum values are stored by their codes. */
    record StateDocument(String pendingExerciseId, List<StepDocument> steps) {
    }

    record StepDocument(String exerciseId, Level level, Competence competence, List<String> skillTags, Outcome outcome) {

        static StepDocument of(PlacementState.Step step) {
            return new StepDocument(step.exerciseId(), step.level(), step.competence(),
                    step.skillTags().stream().map(SkillTag::id).toList(), step.outcome());
        }

        PlacementState.Step toStep() {
            return new PlacementState.Step(exerciseId, level, competence, skillTags.stream().map(SkillTag::of).toList(),
                    outcome);
        }
    }

    /** JSON of {@code result}, keyed by skill tag and competence codes. */
    record ResultDocument(Map<String, Double> initialMastery, List<String> strengths, List<String> weaknesses,
                          Map<String, CompetenceScore> competences) {

        static ResultDocument of(PlacementResult result) {
            return new ResultDocument(
                    result.initialMastery().entrySet().stream()
                            .collect(Collectors.toMap(entry -> entry.getKey().id(), Map.Entry::getValue)),
                    result.strengths().stream().map(SkillTag::id).toList(),
                    result.weaknesses().stream().map(SkillTag::id).toList(),
                    result.competenceScores().entrySet().stream()
                            .collect(Collectors.toMap(entry -> entry.getKey().code(), Map.Entry::getValue)));
        }

        PlacementResult toResult(Level level) {
            return new PlacementResult(level,
                    initialMastery.entrySet().stream()
                            .collect(Collectors.toMap(entry -> SkillTag.of(entry.getKey()), Map.Entry::getValue)),
                    strengths.stream().map(SkillTag::of).toList(),
                    weaknesses.stream().map(SkillTag::of).toList(),
                    competences.entrySet().stream()
                            .collect(Collectors.toMap(entry -> Competence.fromCode(entry.getKey()), Map.Entry::getValue)));
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID userId;

    private PlacementStatus status;

    private String engine;

    private Level startLevel;

    private Level currentLevel;

    private Level resultLevel;

    @JdbcTypeCode(SqlTypes.JSON)
    private StateDocument state;

    @JdbcTypeCode(SqlTypes.JSON)
    private ResultDocument result;

    private Instant startedAt;

    private Instant finishedAt;

    protected PlacementTestEntity() {
    }

    private PlacementTestEntity(UUID userId, PlacementStatus status, String engine, PlacementState state,
                                String pendingExerciseId, Instant startedAt) {
        this.userId = userId;
        this.status = status;
        this.engine = engine;
        this.startLevel = state.startLevel();
        this.startedAt = startedAt;
        update(state, pendingExerciseId);
    }

    /** A test that shows {@code firstExerciseId} first. */
    public static PlacementTestEntity started(UUID userId, String engine, Level startLevel, String firstExerciseId,
                                              Instant at) {
        return new PlacementTestEntity(userId, PlacementStatus.IN_PROGRESS, engine,
                new PlacementState(startLevel, startLevel, List.of()), firstExerciseId, at);
    }

    /** The skip of an absolute beginner (PRD F1): finished at once on {@code level}, without answers. */
    public static PlacementTestEntity skipped(UUID userId, String engine, Level level, Instant at) {
        PlacementTestEntity test = new PlacementTestEntity(userId, PlacementStatus.SKIPPED, engine,
                new PlacementState(level, level, List.of()), null, at);
        test.finish(PlacementResult.withoutAnswers(level), at);
        return test;
    }

    /** Records the answered state and the item shown next. */
    public void advance(PlacementState answered, String nextExerciseId) {
        update(answered, nextExerciseId);
    }

    public void complete(PlacementState answered, PlacementResult placement, Instant at) {
        update(answered, null);
        status = PlacementStatus.COMPLETED;
        finish(placement, at);
    }

    private void finish(PlacementResult placement, Instant at) {
        resultLevel = placement.level();
        result = ResultDocument.of(placement);
        finishedAt = at;
    }

    private void update(PlacementState newState, String pendingExerciseId) {
        currentLevel = newState.currentLevel();
        state = new StateDocument(pendingExerciseId, newState.steps().stream().map(StepDocument::of).toList());
    }

    public PlacementState placementState() {
        return new PlacementState(startLevel, currentLevel, state.steps().stream().map(StepDocument::toStep).toList());
    }

    /** The result of a completed or skipped test. */
    public PlacementResult placementResult() {
        if (result == null) {
            throw new IllegalStateException("Placement test " + id + " has no result");
        }
        return result.toResult(resultLevel);
    }

    public boolean isInProgress() {
        return status == PlacementStatus.IN_PROGRESS;
    }

    public boolean hasResult() {
        return status == PlacementStatus.COMPLETED || status == PlacementStatus.SKIPPED;
    }

    public UUID getId() {
        return id;
    }

    public PlacementStatus getStatus() {
        return status;
    }

    public Level getStartLevel() {
        return startLevel;
    }

    public String getPendingExerciseId() {
        return state.pendingExerciseId();
    }

    public int answeredCount() {
        return state.steps().size();
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }
}
