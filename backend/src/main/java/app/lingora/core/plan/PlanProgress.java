package app.lingora.core.plan;

import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.PlanUnitStatus;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The live status of the units of a plan (PRD 12.3), derived from the lessons completed since. A unit is
 * {@code completed} once it has been completed before or as many lessons as it takes are completed; otherwise a
 * skipped unit stays {@code skipped}. The first remaining unit that has exercises is {@code in_progress}, all others
 * are {@code planned}.
 */
public final class PlanProgress {

    private PlanProgress() {
    }

    /**
     * @param lessonsCompleted completed lessons per unit id
     * @param playable         the units that have exercises the learner can start
     */
    public static LearningPlan apply(LearningPlan plan, Map<String, Integer> lessonsCompleted, Set<String> playable) {
        List<PlanStage> stages = new ArrayList<>();
        boolean currentFound = false;
        for (PlanStage stage : plan.stages()) {
            List<PlanUnit> units = new ArrayList<>();
            for (PlanUnit unit : stage.units()) {
                PlanUnitStatus status;
                if (unit.status() == PlanUnitStatus.COMPLETED
                        || lessonsCompleted.getOrDefault(unit.unitId(), 0) >= unit.lessonCount()) {
                    status = PlanUnitStatus.COMPLETED;
                } else if (unit.status() == PlanUnitStatus.SKIPPED) {
                    status = PlanUnitStatus.SKIPPED;
                } else if (!currentFound && playable.contains(unit.unitId())) {
                    status = PlanUnitStatus.IN_PROGRESS;
                    currentFound = true;
                } else {
                    status = PlanUnitStatus.PLANNED;
                }
                units.add(unit.withStatus(status));
            }
            stages.add(new PlanStage(stage.level(), units));
        }
        return new LearningPlan(plan.generatedAt(), plan.generatedBy(), plan.startLevel(), stages, plan.estimates());
    }
}
