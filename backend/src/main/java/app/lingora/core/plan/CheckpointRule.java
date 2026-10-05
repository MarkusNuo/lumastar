package app.lingora.core.plan;

import app.lingora.domain.CheckpointStatus;
import app.lingora.domain.LearningPlan.PlanStage;
import java.util.Set;

/**
 * The checkpoint at the end of a stage (PRD chapter 5). It is available once every unit of the stage that has exercises
 * is completed or skipped; a stage without exercises keeps it locked. Focus units do not count, they are extra
 * practice. It is passed with an accuracy of at least {@value #PASS_ACCURACY}.
 */
public final class CheckpointRule {

    public static final double PASS_ACCURACY = 0.8;

    private CheckpointRule() {
    }

    /**
     * @param liveStage        the stage with the live status of its units
     * @param unitsWithContent the units that have exercises
     * @param passed           whether the learner has passed this checkpoint before
     */
    public static CheckpointStatus status(PlanStage liveStage, Set<String> unitsWithContent, boolean passed) {
        if (passed) {
            return CheckpointStatus.PASSED;
        }
        return StageProgress.of(liveStage, unitsWithContent).isComplete() ? CheckpointStatus.AVAILABLE : CheckpointStatus.LOCKED;
    }

    public static boolean passes(double accuracy) {
        return accuracy >= PASS_ACCURACY;
    }
}
