package app.lumastar.core.plan;

import app.lumastar.domain.LearningPlan;
import app.lumastar.domain.LearningPlan.PlanUnit;
import app.lumastar.domain.PlanChange;
import app.lumastar.domain.PlanChangeKind;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The plan history entries of a plan revised for changed course content: the curriculum units that came into the plan,
 * e.g. "Neue Einheiten im Kurs: Lebensmittel & Markt, Kochen & Rezepte und 2 weitere", and those that left it. Without
 * an entry the content change does not reach the learner's plan, e.g. for new units below the learner's level.
 */
public final class CourseUpdate {

    /** A reason names this many units and counts the others, unless naming one more would list them all. */
    static final int NAMED_UNITS = 2;

    private CourseUpdate() {
    }

    public static List<PlanChange> between(LearningPlan before, LearningPlan after) {
        List<PlanChange> changes = new ArrayList<>();
        List<PlanUnit> added = curriculumUnitsMissing(after, before);
        if (!added.isEmpty()) {
            changes.add(change(added.size() == 1 ? "Neue Einheit im Kurs" : "Neue Einheiten im Kurs", added));
        }
        List<PlanUnit> removed = curriculumUnitsMissing(before, after);
        if (!removed.isEmpty()) {
            changes.add(change(removed.size() == 1 ? "Einheit nicht mehr im Kurs" : "Einheiten nicht mehr im Kurs", removed));
        }
        return changes;
    }

    /** The curriculum units of {@code plan} that {@code other} lacks, in path order; focus units come and go anyway. */
    private static List<PlanUnit> curriculumUnitsMissing(LearningPlan plan, LearningPlan other) {
        return plan.units().filter(unit -> !unit.isFocus() && other.unit(unit.unitId()).isEmpty()).toList();
    }

    private static PlanChange change(String heading, List<PlanUnit> units) {
        return new PlanChange(PlanChangeKind.REPLANNED, heading + ": " + titles(units),
                Map.of("unitIds", units.stream().map(PlanUnit::unitId).toList()));
    }

    private static String titles(List<PlanUnit> units) {
        List<String> titles = units.stream().map(PlanUnit::title).toList();
        if (titles.size() == 1) {
            return titles.getFirst();
        }
        if (titles.size() > NAMED_UNITS + 1) {
            return String.join(", ", titles.subList(0, NAMED_UNITS)) + " und %d weitere".formatted(titles.size() - NAMED_UNITS);
        }
        return String.join(", ", titles.subList(0, titles.size() - 1)) + " und " + titles.getLast();
    }
}
