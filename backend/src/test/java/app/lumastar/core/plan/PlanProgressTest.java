package app.lumastar.core.plan;

import static app.lumastar.core.plan.PlanFixtures.FOOD;
import static app.lumastar.core.plan.PlanFixtures.learner;
import static app.lumastar.core.plan.PlanFixtures.mastery;
import static app.lumastar.core.plan.PlanFixtures.noMastery;
import static app.lumastar.core.plan.PlanFixtures.withStatuses;
import static app.lumastar.core.plan.PlanFixtures.withUnits;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.domain.LearningPlan;
import app.lumastar.domain.LearningPlan.PlanUnit;
import app.lumastar.domain.Level;
import app.lumastar.domain.PlanUnitStatus;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class PlanProgressTest {

    private static final PlanUnit FOCUS = new PlanUnit("focus_vocab.food_1", "Fokus: Essen", PlanUnitStatus.PLANNED, 1,
            "Fehlerquote 50 % bei Essen");

    private final LearningPlan plan = PlanFixtures.generator().generate(learner(Level.A1_2, 10), noMastery());

    private static Map<String, PlanUnitStatus> statuses(LearningPlan plan) {
        return plan.units().collect(Collectors.toMap(PlanUnit::unitId, PlanUnit::status));
    }

    @Test
    void theFirstPlayableUnitNotDoneIsInProgress() {
        LearningPlan live = PlanProgress.apply(plan, Map.of("a1_food", 2), Set.of("a1_food", "a1_home"));

        assertThat(statuses(live)).containsEntry("a1_food", PlanUnitStatus.IN_PROGRESS)
                .containsEntry("a1_home", PlanUnitStatus.PLANNED)
                .containsEntry("a1_infinitive", PlanUnitStatus.PLANNED);
    }

    @Test
    void aUnitIsCompletedOnceAllItsLessonsAreDone() {
        LearningPlan live = PlanProgress.apply(plan, Map.of("a1_food", 5, "a1_home", 7), Set.of("a1_food", "a1_home", "a2_past"));

        assertThat(statuses(live)).containsEntry("a1_food", PlanUnitStatus.COMPLETED)
                .containsEntry("a1_home", PlanUnitStatus.COMPLETED)
                .containsEntry("a1_infinitive", PlanUnitStatus.PLANNED)
                .containsEntry("a2_past", PlanUnitStatus.IN_PROGRESS);
    }

    @Test
    void skipsUnitsWithoutExercisesWhenLookingForTheCurrentOne() {
        LearningPlan live = PlanProgress.apply(plan, Map.of(), Set.of("a1_infinitive"));

        assertThat(statuses(live)).containsEntry("a1_food", PlanUnitStatus.PLANNED)
                .containsEntry("a1_infinitive", PlanUnitStatus.IN_PROGRESS);
    }

    @Test
    void aSkippedUnitStaysSkippedUnlessItWasCompletedAnyway() {
        LearningPlan skipping = PlanFixtures.generator().generate(learner(Level.A1_2, 10), mastery(FOOD, 0.9));

        assertThat(statuses(PlanProgress.apply(skipping, Map.of("a1_food", 2), Set.of("a1_food", "a1_home"))))
                .containsEntry("a1_food", PlanUnitStatus.SKIPPED)
                .containsEntry("a1_home", PlanUnitStatus.IN_PROGRESS);
        assertThat(statuses(PlanProgress.apply(skipping, Map.of("a1_food", 5), Set.of())))
                .containsEntry("a1_food", PlanUnitStatus.COMPLETED);
    }

    @Test
    void aCompletedUnitStaysCompletedAndStoredProgressIsRederived() {
        LearningPlan stored = withStatuses(plan, Map.of("a1_food", PlanUnitStatus.COMPLETED, "a1_home", PlanUnitStatus.IN_PROGRESS));

        LearningPlan live = PlanProgress.apply(stored, Map.of(), Set.of("a1_infinitive"));

        assertThat(statuses(live)).containsEntry("a1_food", PlanUnitStatus.COMPLETED)
                .containsEntry("a1_home", PlanUnitStatus.PLANNED)
                .containsEntry("a1_infinitive", PlanUnitStatus.IN_PROGRESS);
        assertThat(live.estimates()).isEqualTo(stored.estimates());
    }

    @Test
    void aFocusUnitIsNeverInProgressSoItHoldsBackNoUnitAfterIt() {
        LearningPlan withFocus = withUnits(withStatuses(plan, Map.of("a1_food", PlanUnitStatus.COMPLETED,
                "a1_home", PlanUnitStatus.COMPLETED)), Level.A1_2, FOCUS);

        LearningPlan live = PlanProgress.apply(withFocus, Map.of(), Set.of(FOCUS.unitId(), "a1_infinitive"));

        assertThat(statuses(live)).containsEntry(FOCUS.unitId(), PlanUnitStatus.PLANNED)
                .containsEntry("a1_infinitive", PlanUnitStatus.IN_PROGRESS);
    }

    @Test
    void aFocusUnitIsCompletedByItsLesson() {
        LearningPlan withFocus = withUnits(plan, Level.A1_2, FOCUS);

        LearningPlan live = PlanProgress.apply(withFocus, Map.of(FOCUS.unitId(), 1), Set.of(FOCUS.unitId(), "a1_food"));

        assertThat(statuses(live)).containsEntry(FOCUS.unitId(), PlanUnitStatus.COMPLETED)
                .containsEntry("a1_food", PlanUnitStatus.IN_PROGRESS);
    }
}
