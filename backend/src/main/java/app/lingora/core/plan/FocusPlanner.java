package app.lingora.core.plan;

import app.lingora.domain.FocusUnitId;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.PlanUnitStatus;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SkillTagErrorRate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Focus units for weak skill tags (PRD F3). A tag is weak with at least {@value #MIN_ANSWERS} recent answers and an
 * error rate of at least 40 %. At most {@value #MAX_OPEN} focus units are open at once: open focus units of the
 * previous plan stay, tags a lesson asked a focus unit for (PRD F7) come next, and the weakest tags without one fill
 * the remaining places. A new focus unit of a tag gets the next number after the tag's focus units in the previous
 * plan. All open focus units go right after the unit in progress, or before the first planned unit if none is in
 * progress; completed focus units leave the plan.
 */
final class FocusPlanner {

    static final int MIN_ANSWERS = 5;
    static final double MIN_ERROR_RATE = 0.4;
    static final int MAX_OPEN = 2;
    static final int LESSONS = 1;

    private final SkillTagLabels labels;

    FocusPlanner(SkillTagLabels labels) {
        this.labels = labels;
    }

    static String reason(SkillTagErrorRate weakTag, String label) {
        return "Fehlerquote %d %% bei %s".formatted(Math.round(weakTag.errorRate() * 100), label);
    }

    static String reason(FocusRequest request, String label) {
        return "%d Fehler in einer Lektion bei %s".formatted(request.wrongAnswers(), label);
    }

    static boolean isWeak(SkillTagErrorRate rate) {
        return rate.attempts() >= MIN_ANSWERS && rate.errorRate() >= MIN_ERROR_RATE;
    }

    /** {@code stages} hold the curriculum units only; the result has the focus units inserted. */
    List<PlanStage> insert(List<PlanStage> stages, LearningPlan previous, List<SkillTagErrorRate> errorRates,
                           List<FocusRequest> focusRequests) {
        List<PlanUnit> focusUnits = focusUnits(previous, focusRequests, weakTags(errorRates));
        return focusUnits.isEmpty() ? stages : insertAtCurrentUnit(stages, focusUnits);
    }

    private static Map<SkillTag, SkillTagErrorRate> weakTags(List<SkillTagErrorRate> errorRates) {
        return errorRates.stream()
                .filter(FocusPlanner::isWeak)
                .sorted(Comparator.comparingDouble(SkillTagErrorRate::errorRate).reversed()
                        .thenComparing(Comparator.comparingInt(SkillTagErrorRate::attempts).reversed())
                        .thenComparing(rate -> rate.tag().id()))
                .collect(Collectors.toMap(SkillTagErrorRate::tag, Function.identity(), (first, second) -> first,
                        LinkedHashMap::new));
    }

    private List<PlanUnit> focusUnits(LearningPlan previous, List<FocusRequest> focusRequests,
                                      Map<SkillTag, SkillTagErrorRate> weakTags) {
        List<PlanUnit> previousFocus = previous.units().filter(PlanUnit::isFocus).toList();
        List<PlanUnit> focus = new ArrayList<>();
        List<SkillTag> covered = new ArrayList<>();
        for (PlanUnit unit : previousFocus) {
            FocusUnitId id = FocusUnitId.parse(unit.unitId()).orElseThrow();
            if (unit.status() != PlanUnitStatus.COMPLETED && focus.size() < MAX_OPEN) {
                SkillTagErrorRate weak = weakTags.get(id.tag());
                focus.add(weak == null ? unit.withStatus(PlanUnitStatus.PLANNED) : focusUnit(id, weak));
                covered.add(id.tag());
            }
        }
        for (FocusRequest request : focusRequests) {
            if (focus.size() < MAX_OPEN && !covered.contains(request.tag())) {
                String label = labels.of(request.tag());
                FocusUnitId id = new FocusUnitId(request.tag(), nextNumber(request.tag(), previousFocus));
                focus.add(new PlanUnit(id.id(), "Fokus: " + label, PlanUnitStatus.PLANNED, LESSONS, reason(request, label)));
                covered.add(request.tag());
            }
        }
        for (SkillTagErrorRate weak : weakTags.values()) {
            if (focus.size() == MAX_OPEN) {
                break;
            }
            if (!covered.contains(weak.tag())) {
                focus.add(focusUnit(new FocusUnitId(weak.tag(), nextNumber(weak.tag(), previousFocus)), weak));
            }
        }
        return focus;
    }

    private PlanUnit focusUnit(FocusUnitId id, SkillTagErrorRate weak) {
        String label = labels.of(id.tag());
        return new PlanUnit(id.id(), "Fokus: " + label, PlanUnitStatus.PLANNED, LESSONS, reason(weak, label));
    }

    private static int nextNumber(SkillTag tag, List<PlanUnit> previousFocus) {
        return previousFocus.stream()
                .map(unit -> FocusUnitId.parse(unit.unitId()).orElseThrow())
                .filter(id -> id.tag().equals(tag))
                .mapToInt(FocusUnitId::number)
                .max()
                .orElse(0) + 1;
    }

    private static List<PlanStage> insertAtCurrentUnit(List<PlanStage> stages, List<PlanUnit> focusUnits) {
        if (stages.isEmpty()) {
            return stages;
        }
        Position position = position(stages);
        List<PlanStage> result = new ArrayList<>(stages);
        PlanStage stage = stages.get(position.stage());
        List<PlanUnit> units = new ArrayList<>(stage.units());
        units.addAll(position.unit(), focusUnits);
        result.set(position.stage(), new PlanStage(stage.level(), units));
        return result;
    }

    private record Position(int stage, int unit) {
    }

    private static Position position(List<PlanStage> stages) {
        Position beforeFirstPlanned = null;
        for (int s = 0; s < stages.size(); s++) {
            List<PlanUnit> units = stages.get(s).units();
            for (int u = 0; u < units.size(); u++) {
                PlanUnitStatus status = units.get(u).status();
                if (status == PlanUnitStatus.IN_PROGRESS) {
                    return new Position(s, u + 1);
                }
                if (status == PlanUnitStatus.PLANNED && beforeFirstPlanned == null) {
                    beforeFirstPlanned = new Position(s, u);
                }
            }
        }
        if (beforeFirstPlanned != null) {
            return beforeFirstPlanned;
        }
        int last = stages.size() - 1;
        return new Position(last, stages.get(last).units().size());
    }
}
