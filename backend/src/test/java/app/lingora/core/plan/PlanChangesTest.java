package app.lingora.core.plan;

import static app.lingora.core.plan.PlanFixtures.FOOD;
import static app.lingora.core.plan.PlanFixtures.HOME;
import static app.lingora.core.plan.PlanFixtures.INFINITIVE;
import static app.lingora.core.plan.PlanFixtures.LABELS;
import static app.lingora.core.plan.PlanFixtures.learner;
import static app.lingora.core.plan.PlanFixtures.mastery;
import static app.lingora.core.plan.PlanFixtures.noMastery;
import static app.lingora.core.plan.PlanFixtures.withStatuses;
import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.domain.LearningPlan;
import app.lingora.domain.Level;
import app.lingora.domain.PlanChange;
import app.lingora.domain.PlanChangeKind;
import app.lingora.domain.PlanUnitStatus;
import app.lingora.domain.SkillTagErrorRate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PlanChangesTest {

    private final RuleBasedPlanGenerator generator = PlanFixtures.generator();

    @Test
    void theFirstPlanListsItsSkippedUnits() {
        LearningPlan plan = generator.generate(learner(Level.A1_2, 10), mastery(FOOD, 0.9));

        assertThat(PlanChanges.between(null, plan, LABELS, List.of())).containsExactly(new PlanChange(
                PlanChangeKind.UNIT_SKIPPED, "Einheit ‚Essen & Trinken‘ übersprungen: bereits beherrscht",
                Map.of("unitId", "a1_food")));
    }

    @Test
    void aRevisionListsInsertedFocusUnitsWithTheirErrorRate() {
        LearningPlan before = withStatuses(generator.generate(learner(Level.A1_2, 10), noMastery()),
                Map.of("a1_home", PlanUnitStatus.IN_PROGRESS));
        List<SkillTagErrorRate> rates = List.of(new SkillTagErrorRate(INFINITIVE, 11, 5));
        LearningPlan after = generator.revise(before, learner(Level.A1_2, 10), noMastery(), rates);

        assertThat(PlanChanges.between(before, after, LABELS, rates)).containsExactly(new PlanChange(
                PlanChangeKind.FOCUS_INSERTED, "Fokus-Lektion ‚Infinitiv me + Partizip‘ eingefügt, Fehlerquote 45 %",
                Map.of("unitId", "focus_grammar.infinitive_1", "skillTag", "grammar.infinitive", "errorRate", 0.45,
                        "attempts", 11)));
        assertThat(PlanChanges.between(after, generator.revise(after, learner(Level.A1_2, 10), noMastery(), rates), LABELS,
                rates)).as("a focus unit that stays is not inserted again").isEmpty();
    }

    @Test
    void aRevisionListsShortenedAndNewlySkippedUnits() {
        LearningPlan before = generator.generate(learner(Level.A1_2, 10), noMastery());
        LearningPlan after = generator.revise(before, learner(Level.A1_2, 10), mastery(HOME, 0.9, FOOD, 0.85), List.of());

        assertThat(PlanChanges.between(before, after, LABELS, List.of())).containsExactly(
                new PlanChange(PlanChangeKind.UNIT_SKIPPED, "Einheit ‚Essen & Trinken‘ übersprungen: bereits beherrscht",
                        Map.of("unitId", "a1_food")),
                new PlanChange(PlanChangeKind.UNIT_SHORTENED, "Einheit ‚Zuhause‘ verkürzt: 3 statt 4 Lektionen",
                        Map.of("unitId", "a1_home", "lessonsBefore", 4, "lessonsAfter", 3)));
    }

    @Test
    void aFocusUnitWithoutKnownErrorRateIsStillListed() {
        LearningPlan before = generator.generate(learner(Level.A1_2, 10), noMastery());
        LearningPlan after = generator.revise(before, learner(Level.A1_2, 10), noMastery(),
                List.of(new SkillTagErrorRate(INFINITIVE, 10, 8)));

        assertThat(PlanChanges.between(before, after, LABELS, List.of()))
                .extracting(PlanChange::reason)
                .containsExactly("Fokus-Lektion ‚Infinitiv me + Partizip‘ eingefügt");
    }

    @Test
    void anUnchangedPlanHasNoChanges() {
        LearningPlan plan = generator.generate(learner(Level.A1_2, 10), mastery(FOOD, 0.9));

        assertThat(PlanChanges.between(plan, generator.revise(plan, learner(Level.A1_2, 10), mastery(FOOD, 0.9), List.of()),
                LABELS, List.of())).isEmpty();
    }
}
