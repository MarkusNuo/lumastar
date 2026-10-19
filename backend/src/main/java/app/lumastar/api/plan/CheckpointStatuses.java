package app.lumastar.api.plan;

import app.lumastar.core.plan.CheckpointRule;
import app.lumastar.core.plan.StageProgress;
import app.lumastar.domain.CheckpointStatus;
import app.lumastar.domain.LearningPlan;
import app.lumastar.domain.LearningPlan.PlanStage;
import app.lumastar.domain.Level;
import app.lumastar.persistence.LearningPlanStore;
import app.lumastar.persistence.LessonProgressQueries;
import app.lumastar.persistence.LivePlans;
import app.lumastar.persistence.UnitEntity;
import app.lumastar.persistence.UnitRepository;
import app.lumastar.persistence.UserRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** The checkpoint of every stage of the learner's plan, see {@link CheckpointRule}. */
@Component
public class CheckpointStatuses {

    private final LearningPlanStore plans;
    private final LivePlans livePlans;
    private final LessonProgressQueries lessons;
    private final UnitRepository units;
    private final UserRepository users;

    CheckpointStatuses(LearningPlanStore plans, LivePlans livePlans, LessonProgressQueries lessons, UnitRepository units,
                       UserRepository users) {
        this.plans = plans;
        this.livePlans = livePlans;
        this.lessons = lessons;
        this.units = units;
        this.users = users;
    }

    /** A stage of the live plan with the progress towards its checkpoint and the checkpoint's status. */
    public record StageCheckpoint(PlanStage stage, StageProgress progress, CheckpointStatus status) {
    }

    /** Per stage of the live plan, in plan order. */
    @Transactional(readOnly = true)
    public Map<Level, CheckpointStatus> of(UUID userId, LearningPlan live) {
        Set<String> withContent = unitsWithContent();
        Set<Level> passed = lessons.passedCheckpoints(userId);
        Map<Level, CheckpointStatus> statuses = new LinkedHashMap<>();
        live.stages().forEach(stage -> statuses.put(stage.level(),
                CheckpointRule.status(stage, withContent, passed.contains(stage.level()))));
        return statuses;
    }

    /** The stage {@code level} of the learner's current plan; empty if the plan does not contain it. */
    @Transactional(readOnly = true)
    public Optional<StageCheckpoint> stage(UUID userId, Level level) {
        Level learnerLevel = users.findById(userId).orElseThrow().getCurrentLevel();
        Set<String> withContent = unitsWithContent();
        return plans.current(userId)
                .map(stored -> livePlans.live(userId, stored, learnerLevel))
                .flatMap(live -> live.stages().stream().filter(stage -> stage.level() == level).findFirst())
                .map(stage -> new StageCheckpoint(stage, StageProgress.of(stage, withContent),
                        CheckpointRule.status(stage, withContent, lessons.passedCheckpoints(userId).contains(level))));
    }

    private Set<String> unitsWithContent() {
        return units.findByRetiredAtIsNullOrderByPosition().stream()
                .filter(UnitEntity::hasContent)
                .map(UnitEntity::getId)
                .collect(Collectors.toSet());
    }
}
