package app.lingora.api.plan;

import app.lingora.api.error.ApiProblemException;
import app.lingora.api.plan.PathResponse.Checkpoint;
import app.lingora.api.plan.PathResponse.PassedStage;
import app.lingora.api.plan.PathResponse.PathStage;
import app.lingora.api.plan.PathResponse.PathUnit;
import app.lingora.core.lesson.LessonComposer;
import app.lingora.core.plan.CheckpointRule;
import app.lingora.core.plan.PlanProgress;
import app.lingora.domain.CheckpointStatus;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.Level;
import app.lingora.persistence.ContentCatalog;
import app.lingora.persistence.LearningPlanStore;
import app.lingora.persistence.LearningPlanStore.StoredPlan;
import app.lingora.persistence.LessonProgressQueries;
import app.lingora.persistence.LivePlans;
import app.lingora.persistence.StageEntity;
import app.lingora.persistence.StageRepository;
import app.lingora.persistence.UnitEntity;
import app.lingora.persistence.UnitRepository;
import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read side of the plan: the stored plan, its history and the learning path with live progress. */
@Service
class PathService {

    static final String TARGET_LEVEL = "C2";
    static final String FOCUS_ICON = "target";

    private final UserRepository users;
    private final LearningPlanStore plans;
    private final LivePlans livePlans;
    private final StageRepository stages;
    private final UnitRepository units;
    private final CheckpointStatuses checkpoints;
    private final ContentCatalog catalog;
    private final LessonComposer composer;
    private final LessonProgressQueries lessons;

    PathService(UserRepository users, LearningPlanStore plans, LivePlans livePlans, StageRepository stages,
                UnitRepository units, CheckpointStatuses checkpoints, ContentCatalog catalog, LessonComposer composer,
                LessonProgressQueries lessons) {
        this.users = users;
        this.plans = plans;
        this.livePlans = livePlans;
        this.stages = stages;
        this.units = units;
        this.checkpoints = checkpoints;
        this.catalog = catalog;
        this.composer = composer;
        this.lessons = lessons;
    }

    @Transactional(readOnly = true)
    PlanResponse plan(UUID userId) {
        return PlanResponse.of(currentPlan(userId), stageTitles());
    }

    @Transactional(readOnly = true)
    List<PlanChangeResponse> changes(UUID userId) {
        return plans.changes(userId).stream().map(PlanChangeResponse::of).toList();
    }

    @Transactional(readOnly = true)
    PathResponse path(UUID userId) {
        UserEntity learner = users.findById(userId).orElseThrow();
        StoredPlan stored = currentPlan(userId);
        LivePlans.Progress progress = livePlans.progress(userId, stored, learner.getCurrentLevel());
        LearningPlan live = PlanProgress.apply(stored.plan(), progress.lessonsCompleted(), progress.playable());
        Map<String, UnitEntity> unitsById = units.findAllById(live.units().map(PlanUnit::unitId).toList()).stream()
                .collect(Collectors.toMap(UnitEntity::getId, Function.identity()));
        Map<Level, String> titles = stageTitles();
        Map<Level, CheckpointStatus> checkpointStatuses = checkpoints.of(userId, live);
        Map<String, Integer> exercisesByUnit = catalog.lessonExerciseCountsByUnit();
        return new PathResponse(learner.getCurrentLevel(), TARGET_LEVEL, learner.getDailyGoalMinutes(),
                PlanResponse.estimates(live.estimates()), previousStage(userId, learner.getCurrentLevel(), titles),
                live.stages().stream()
                        .map(stage -> new PathStage(stage.level(), titles.getOrDefault(stage.level(), stage.level().code()),
                                checkpoint(stage, checkpointStatuses.get(stage.level()), exercisesByUnit),
                                stage.units().stream().map(unit -> pathUnit(unit, unitsById.get(unit.unitId()), progress)).toList()))
                        .toList());
    }

    private PassedStage previousStage(UUID userId, Level currentLevel, Map<Level, String> titles) {
        return lessons.lastPassedCheckpointBelow(userId, currentLevel)
                .map(passed -> new PassedStage(passed.level(), titles.getOrDefault(passed.level(), passed.level().code()),
                        passed.passedAt(), passed.accuracy()))
                .orElse(null);
    }

    /** The checkpoint is made of the exercises of the stage's curriculum units, see {@link LessonComposer}. */
    private Checkpoint checkpoint(PlanStage stage, CheckpointStatus status, Map<String, Integer> exercisesByUnit) {
        int stageExercises = stage.units().stream()
                .filter(unit -> !unit.isFocus())
                .mapToInt(unit -> exercisesByUnit.getOrDefault(unit.unitId(), 0))
                .sum();
        return new Checkpoint(status, composer.checkpointLength(stageExercises), CheckpointRule.PASS_ACCURACY);
    }

    private static PathUnit pathUnit(PlanUnit unit, UnitEntity content, LivePlans.Progress progress) {
        int lessonsCompleted = Math.min(progress.lessonsCompleted().getOrDefault(unit.unitId(), 0), unit.lessonCount());
        boolean playable = progress.playable().contains(unit.unitId());
        if (content == null) {
            return new PathUnit(unit.unitId(), unit.title(), null, unit.isFocus() ? FOCUS_ICON : null, unit.status(),
                    unit.isFocus(), unit.reason(), unit.lessonCount(), lessonsCompleted, playable);
        }
        return new PathUnit(unit.unitId(), unit.title(), content.getColor(), content.getIcon(), unit.status(), false,
                unit.reason(), unit.lessonCount(), lessonsCompleted, playable);
    }

    private StoredPlan currentPlan(UUID userId) {
        return plans.current(userId).orElseThrow(() -> new ApiProblemException(HttpStatus.NOT_FOUND, "plan_not_found",
                "There is no learning plan yet; it is created by the placement test or its skip."));
    }

    private Map<Level, String> stageTitles() {
        return stages.findAll().stream().collect(Collectors.toMap(StageEntity::getLevel, StageEntity::getTitle));
    }
}
