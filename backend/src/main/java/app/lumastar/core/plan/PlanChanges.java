package app.lumastar.core.plan;

import app.lumastar.domain.FocusUnitId;
import app.lumastar.domain.LearningPlan;
import app.lumastar.domain.LearningPlan.PlanUnit;
import app.lumastar.domain.PlanChange;
import app.lumastar.domain.PlanChangeKind;
import app.lumastar.domain.PlanUnitStatus;
import app.lumastar.domain.SkillTag;
import app.lumastar.domain.SkillTagErrorRate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The plan history entries of a new plan version compared to the previous one: replaced and inserted focus
 * units, newly skipped units and shortened units, each with its German reason. Derived from the plans alone, so the
 * history does not depend on the generator that produced them.
 */
public final class PlanChanges {

    private PlanChanges() {
    }

    /**
     * @param before     the previous plan, {@code null} for the first plan
     * @param errorRates the error rates the new plan was based on; they explain focus units
     */
    public static List<PlanChange> between(LearningPlan before, LearningPlan after, Map<SkillTag, String> skillTagLabels,
                                           List<SkillTagErrorRate> errorRates) {
        SkillTagLabels labels = new SkillTagLabels(skillTagLabels);
        List<PlanChange> changes = new ArrayList<>();
        if (before != null) {
            before.units()
                    .filter(unit -> unit.isFocus() && unit.status() != PlanUnitStatus.COMPLETED)
                    .filter(unit -> after.unit(unit.unitId()).isEmpty())
                    .forEach(unit -> changes.add(focusReplaced(unit, labels)));
        }
        after.units().forEach(unit -> {
            Optional<PlanUnit> previous = before == null ? Optional.empty() : before.unit(unit.unitId());
            Optional<FocusUnitId> focus = FocusUnitId.parse(unit.unitId());
            if (focus.isPresent()) {
                if (previous.isEmpty()) {
                    changes.add(focusInserted(unit, focus.get(), labels, errorRates));
                }
            } else if (unit.status() == PlanUnitStatus.SKIPPED
                    && previous.map(earlier -> earlier.status() != PlanUnitStatus.SKIPPED).orElse(true)) {
                changes.add(new PlanChange(PlanChangeKind.UNIT_SKIPPED,
                        "Einheit ‚%s‘ übersprungen: bereits beherrscht".formatted(unit.title()), Map.of("unitId", unit.unitId())));
            } else if (previous.isPresent() && unit.lessonCount() < previous.get().lessonCount()) {
                changes.add(unitShortened(unit, previous.get().lessonCount()));
            }
        });
        return changes;
    }

    /**
     * The history entry of every focus request for whose tag the new plan inserted a focus unit; a request
     * without one, e.g. for a tag with an open focus unit already, changed nothing and has no entry.
     */
    public static List<PlanChange> requestedFocus(LearningPlan before, LearningPlan after, List<FocusRequest> requests,
                                                  Map<SkillTag, String> skillTagLabels) {
        if (before == null) {
            return List.of();
        }
        SkillTagLabels labels = new SkillTagLabels(skillTagLabels);
        List<SkillTag> insertedFocus = after.units()
                .filter(unit -> before.unit(unit.unitId()).isEmpty())
                .flatMap(unit -> FocusUnitId.parse(unit.unitId()).stream())
                .map(FocusUnitId::tag)
                .toList();
        return requests.stream()
                .filter(request -> insertedFocus.contains(request.tag()))
                .map(request -> new PlanChange(PlanChangeKind.REPLANNED,
                        "Lektion mit %d Fehlern bei ‚%s‘".formatted(request.wrongAnswers(), labels.of(request.tag())),
                        Map.of("skillTag", request.tag().id(), "wrongAnswers", request.wrongAnswers())))
                .toList();
    }

    private static PlanChange focusReplaced(PlanUnit unit, SkillTagLabels labels) {
        SkillTag tag = FocusUnitId.parse(unit.unitId()).orElseThrow().tag();
        String reason = "Fokus-Lektion ‚%s‘ ersetzt: höchstens %d offene Fokus-Lektionen".formatted(labels.of(tag),
                FocusPlanner.MAX_OPEN);
        return new PlanChange(PlanChangeKind.REPLANNED, reason,
                Map.of("unitId", unit.unitId(), "skillTag", tag.id()));
    }

    private static PlanChange focusInserted(PlanUnit unit, FocusUnitId focus, SkillTagLabels labels,
                                            List<SkillTagErrorRate> errorRates) {
        String reason = "Fokus-Lektion ‚%s‘ eingefügt".formatted(labels.of(focus.tag()));
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("unitId", unit.unitId());
        details.put("skillTag", focus.tag().id());
        Optional<SkillTagErrorRate> rate = errorRates.stream().filter(entry -> entry.tag().equals(focus.tag())).findFirst();
        if (rate.isPresent()) {
            reason += ", Fehlerquote %d %%".formatted(Math.round(rate.get().errorRate() * 100));
            details.put("errorRate", Math.round(rate.get().errorRate() * 100) / 100.0);
            details.put("attempts", rate.get().attempts());
        }
        return new PlanChange(PlanChangeKind.FOCUS_INSERTED, reason, details);
    }

    private static PlanChange unitShortened(PlanUnit unit, int lessonsBefore) {
        return new PlanChange(PlanChangeKind.UNIT_SHORTENED,
                "Einheit ‚%s‘ verkürzt: %d statt %d Lektionen".formatted(unit.title(), unit.lessonCount(), lessonsBefore),
                Map.of("unitId", unit.unitId(), "lessonsBefore", lessonsBefore, "lessonsAfter", unit.lessonCount()));
    }
}
