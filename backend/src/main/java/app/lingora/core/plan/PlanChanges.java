package app.lingora.core.plan;

import app.lingora.domain.FocusUnitId;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.PlanChange;
import app.lingora.domain.PlanChangeKind;
import app.lingora.domain.PlanUnitStatus;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SkillTagErrorRate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The plan history entries of a new plan version compared to the previous one (PRD F3): inserted focus units,
 * newly skipped units and shortened units, each with its German reason. Derived from the plans alone, so the history
 * does not depend on the generator that produced them.
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
