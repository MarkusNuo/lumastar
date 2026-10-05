package app.lingora.api.plan;

import app.lingora.core.plan.CheckpointRule;
import app.lingora.domain.CheckpointStatus;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.Level;
import app.lingora.persistence.LearningPlanStore;
import app.lingora.persistence.LessonProgressQueries;
import app.lingora.persistence.LivePlans;
import app.lingora.persistence.UnitEntity;
import app.lingora.persistence.UnitRepository;
import app.lingora.persistence.UserRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** The checkpoint of every stage of the learner's plan (PRD chapter 5), see {@link CheckpointRule}. */
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

    /** A stage of the live plan with the status of its checkpoint. */
    public record StageCheckpoint(PlanStage stage, CheckpointStatus status) {
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
        return plans.current(userId)
                .map(stored -> livePlans.live(userId, stored, learnerLevel))
                .flatMap(live -> live.stages().stream().filter(stage -> stage.level() == level).findFirst()
                        .map(stage -> new StageCheckpoint(stage, of(userId, live).get(level))));
    }

    private Set<String> unitsWithContent() {
        return units.findByRetiredAtIsNullOrderByPosition().stream()
                .filter(UnitEntity::hasContent)
                .map(UnitEntity::getId)
                .collect(Collectors.toSet());
    }
}
