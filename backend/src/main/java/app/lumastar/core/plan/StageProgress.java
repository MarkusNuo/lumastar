package app.lumastar.core.plan;

import app.lumastar.domain.LearningPlan.PlanStage;
import app.lumastar.domain.LearningPlan.PlanUnit;
import app.lumastar.domain.PlanUnitStatus;
import java.util.List;
import java.util.Set;

/**
 * Progress through a stage towards its checkpoint: the units of the stage that have exercises,
 * and how many of them are completed or skipped. Focus units are extra practice and do not count.
 */
public record StageProgress(int completed, int skipped, int total) {

    public StageProgress {
        if (completed < 0 || skipped < 0 || completed + skipped > total) {
            throw new IllegalArgumentException("completed (%d) and skipped (%d) units must not exceed the total (%d)"
                    .formatted(completed, skipped, total));
        }
    }

    /**
     * @param liveStage        the stage with the live status of its units
     * @param unitsWithContent the units that have exercises
     */
    public static StageProgress of(PlanStage liveStage, Set<String> unitsWithContent) {
        List<PlanUnit> playable = liveStage.units().stream()
                .filter(unit -> !unit.isFocus() && unitsWithContent.contains(unit.unitId()))
                .toList();
        return new StageProgress(count(playable, PlanUnitStatus.COMPLETED), count(playable, PlanUnitStatus.SKIPPED),
                playable.size());
    }

    public int done() {
        return completed + skipped;
    }

    /** A stage without exercises is never complete. */
    public boolean isComplete() {
        return total > 0 && done() == total;
    }

    /** The share of done units in whole percent, rounded down so that 100 means complete. */
    public int percent() {
        return total == 0 ? 0 : done() * 100 / total;
    }

    private static int count(List<PlanUnit> units, PlanUnitStatus status) {
        return (int) units.stream().filter(unit -> unit.status() == status).count();
    }
}
