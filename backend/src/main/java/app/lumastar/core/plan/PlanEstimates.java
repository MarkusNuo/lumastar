package app.lumastar.core.plan;

import app.lumastar.domain.CefrBand;
import app.lumastar.domain.LearningPlan.PlanStage;
import app.lumastar.domain.LearningPlan.PlanUnit;
import app.lumastar.domain.Level;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Time estimates of a plan: for every CEFR band from A1 on, the day by which its last stage in the plan is
 * done, learning the daily goal every day: {@code today + ceil(minutes / dailyGoalMinutes)} days. The minutes are the
 * larger of
 * <ul>
 *   <li>the lessons of all units still to do up to that stage, at {@link EstimateRules#minutesPerLesson()} each, and</li>
 *   <li>the guided learning hours from the learner's stage to the end of the band ({@link EstimateRules}).</li>
 * </ul>
 */
final class PlanEstimates {

    private PlanEstimates() {
    }

    /** @param position the learner's current stage */
    static Map<CefrBand, LocalDate> of(List<PlanStage> stages, Level position, int dailyGoalMinutes, LocalDate today,
                                       EstimateRules rules) {
        Map<CefrBand, LocalDate> estimates = new EnumMap<>(CefrBand.class);
        int lessons = 0;
        for (PlanStage stage : stages) {
            lessons += stage.units().stream().filter(unit -> !unit.status().isDone()).mapToInt(PlanUnit::lessonCount).sum();
            CefrBand band = stage.level().band();
            if (band != CefrBand.A0) {
                long minutes = Math.max((long) lessons * rules.minutesPerLesson(), rules.minutesFrom(position, band));
                estimates.put(band, today.plusDays(Math.ceilDiv(minutes, dailyGoalMinutes)));
            }
        }
        return estimates;
    }
}
