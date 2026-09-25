package app.lingora.core.plan;

import app.lingora.domain.CefrBand;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Time estimates of a plan (PRD F3): for every CEFR band from A1 on, the day by which its last stage in the plan is
 * done. The lessons of all units still to do up to that stage take {@value #MINUTES_PER_LESSON} minutes each, learned
 * at the daily goal: {@code today + ceil(lessons × 4 / dailyGoalMinutes)} days.
 */
final class PlanEstimates {

    static final int MINUTES_PER_LESSON = 4;

    private PlanEstimates() {
    }

    static Map<CefrBand, LocalDate> of(List<PlanStage> stages, int dailyGoalMinutes, LocalDate today) {
        Map<CefrBand, LocalDate> estimates = new EnumMap<>(CefrBand.class);
        int lessons = 0;
        for (PlanStage stage : stages) {
            lessons += stage.units().stream().filter(unit -> !unit.status().isDone()).mapToInt(PlanUnit::lessonCount).sum();
            CefrBand band = stage.level().band();
            if (band != CefrBand.A0) {
                estimates.put(band, today.plusDays(Math.ceilDiv(lessons * MINUTES_PER_LESSON, dailyGoalMinutes)));
            }
        }
        return estimates;
    }
}
