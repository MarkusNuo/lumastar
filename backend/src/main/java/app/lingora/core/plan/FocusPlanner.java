package app.lingora.core.plan;

import app.lingora.domain.FocusUnitId;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.Level;
import app.lingora.domain.PlanUnitStatus;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SkillTagErrorRate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
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
 * plan. Completed focus units leave the plan.
 * <p>
 * Focus units are optional extras (see {@link PlanProgress}) that keep their place: right after the curriculum unit
 * they were inserted for, or at the start of the stage once that unit lies in an earlier stage, i.e. at the start of
 * the first stage after a level-up. A new focus unit is inserted for the unit in progress, or before the first planned
 * unit if none is in progress, or at the very end if everything is done. Focus units at one place keep their order.
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
        return focusUnits.isEmpty() || stages.isEmpty() ? stages : insertAtTheirPlaces(stages, previous, focusUnits);
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

    /** Right after the curriculum unit {@code after} of the stage, or at the start of the stage if it is null. */
    private record Place(Level stage, String after) {
    }

    /** A kept focus unit goes to its place in the previous plan, a new one to the current place. */
    private static List<PlanStage> insertAtTheirPlaces(List<PlanStage> stages, LearningPlan previous,
                                                       List<PlanUnit> focusUnits) {
        Map<String, Place> previousPlaces = focusPlaces(previous);
        Place current = currentPlace(stages);
        List<List<PlanUnit>> units = new ArrayList<>();
        stages.forEach(stage -> units.add(new ArrayList<>(stage.units())));
        for (PlanUnit focus : focusUnits) {
            Place place = previousPlaces.getOrDefault(focus.unitId(), current);
            int stage = indexOfStage(stages, place.stage());
            int index = 0;
            if (stage < 0) {
                stage = 0;
            } else {
                index = indexOfUnit(units.get(stage), place.after()) + 1;
            }
            List<PlanUnit> stageUnits = units.get(stage);
            while (index < stageUnits.size() && stageUnits.get(index).isFocus()) {
                index++;
            }
            stageUnits.add(index, focus);
        }
        List<PlanStage> result = new ArrayList<>();
        for (int s = 0; s < stages.size(); s++) {
            result.add(new PlanStage(stages.get(s).level(), units.get(s)));
        }
        return result;
    }

    private static Map<String, Place> focusPlaces(LearningPlan plan) {
        Map<String, Place> places = new HashMap<>();
        for (PlanStage stage : plan.stages()) {
            String after = null;
            for (PlanUnit unit : stage.units()) {
                if (unit.isFocus()) {
                    places.put(unit.unitId(), new Place(stage.level(), after));
                } else {
                    after = unit.unitId();
                }
            }
        }
        return places;
    }

    /** After the unit in progress, else before the first planned unit, else at the very end. */
    private static Place currentPlace(List<PlanStage> stages) {
        Place beforeFirstPlanned = null;
        for (PlanStage stage : stages) {
            String after = null;
            for (PlanUnit unit : stage.units()) {
                if (unit.status() == PlanUnitStatus.IN_PROGRESS) {
                    return new Place(stage.level(), unit.unitId());
                }
                if (unit.status() == PlanUnitStatus.PLANNED && beforeFirstPlanned == null) {
                    beforeFirstPlanned = new Place(stage.level(), after);
                }
                after = unit.unitId();
            }
        }
        if (beforeFirstPlanned != null) {
            return beforeFirstPlanned;
        }
        PlanStage last = stages.getLast();
        return new Place(last.level(), last.units().isEmpty() ? null : last.units().getLast().unitId());
    }

    /** -1 if the plan no longer has the stage, e.g. after a level-up. */
    private static int indexOfStage(List<PlanStage> stages, Level level) {
        for (int s = 0; s < stages.size(); s++) {
            if (stages.get(s).level() == level) {
                return s;
            }
        }
        return -1;
    }

    /** -1 for {@code null}, the start of the stage, and for a unit the stage no longer has. */
    private static int indexOfUnit(List<PlanUnit> units, String unitId) {
        for (int u = 0; u < units.size(); u++) {
            if (units.get(u).unitId().equals(unitId)) {
                return u;
            }
        }
        return -1;
    }
}
