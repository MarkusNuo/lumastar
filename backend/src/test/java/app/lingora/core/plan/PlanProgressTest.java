package app.lingora.core.plan;

import static app.lingora.core.plan.PlanFixtures.FOOD;
import static app.lingora.core.plan.PlanFixtures.learner;
import static app.lingora.core.plan.PlanFixtures.mastery;
import static app.lingora.core.plan.PlanFixtures.noMastery;
import static app.lingora.core.plan.PlanFixtures.withStatuses;
import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.Level;
import app.lingora.domain.PlanUnitStatus;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class PlanProgressTest {

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
}
