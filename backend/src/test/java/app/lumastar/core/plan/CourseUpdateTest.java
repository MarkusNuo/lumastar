package app.lumastar.core.plan;

import static app.lumastar.core.plan.PlanFixtures.CLOCK;
import static app.lumastar.core.plan.PlanFixtures.CURRICULUM;
import static app.lumastar.core.plan.PlanFixtures.LABELS;
import static app.lumastar.core.plan.PlanFixtures.LESSONS_ONLY;
import static app.lumastar.core.plan.PlanFixtures.curriculumWith;
import static app.lumastar.core.plan.PlanFixtures.learner;
import static app.lumastar.core.plan.PlanFixtures.noMastery;
import static app.lumastar.core.plan.PlanFixtures.unit;
import static app.lumastar.core.plan.PlanFixtures.withStatuses;
import static app.lumastar.core.plan.PlanFixtures.withUnits;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.domain.LearningPlan;
import app.lumastar.domain.LearningPlan.PlanUnit;
import app.lumastar.domain.Level;
import app.lumastar.domain.PlanChange;
import app.lumastar.domain.PlanChangeKind;
import app.lumastar.domain.PlanUnitStatus;
import app.lumastar.domain.Stage;
import app.lumastar.domain.Unit;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CourseUpdateTest {

    private static final Unit MARKET = unit("a1_market", Level.A1_3, "Lebensmittel & Markt", 4);
    private static final Unit COOKING = unit("a1_cooking", Level.A1_3, "Kochen & Rezepte", 3);
    private static final Unit WEATHER = unit("a1_weather", Level.A1_3, "Wetter & Klima", 4);
    private static final Unit SPORT = unit("a1_sport", Level.A1_3, "Sport & Hobbys", 4);

    /** On A1.2 with the food unit completed and the home unit in progress. */
    private final LearningPlan before = withStatuses(PlanFixtures.generator().generate(learner(Level.A1_2, 10), noMastery()),
            Map.of("a1_food", PlanUnitStatus.COMPLETED, "a1_home", PlanUnitStatus.IN_PROGRESS));

    @Test
    void namesANewUnitOfTheLearnersRangeWhileTheProgressStays() {
        LearningPlan after = revise(before, curriculumWith(Level.A1_3, MARKET));

        assertThat(CourseUpdate.between(before, after)).containsExactly(new PlanChange(PlanChangeKind.REPLANNED,
                "Neue Einheit im Kurs: Lebensmittel & Markt", Map.of("unitIds", List.of("a1_market"))));
        assertThat(after.units().map(unit -> unit.unitId() + ":" + unit.status().code())).containsExactly(
                "a1_food:completed", "a1_home:in_progress", "a1_infinitive:planned", "a1_review:planned",
                "a1_market:planned", "a2_past:planned", "b1_opinions:planned");
    }

    @Test
    void namesUpToThreeNewUnitsAndCountsTheOthersBeyondTwo() {
        assertThat(reasons(curriculumWith(Level.A1_3, MARKET, COOKING)))
                .containsExactly("Neue Einheiten im Kurs: Lebensmittel & Markt und Kochen & Rezepte");
        assertThat(reasons(curriculumWith(Level.A1_3, MARKET, COOKING, WEATHER)))
                .containsExactly("Neue Einheiten im Kurs: Lebensmittel & Markt, Kochen & Rezepte und Wetter & Klima");
        assertThat(reasons(curriculumWith(Level.A1_3, MARKET, COOKING, WEATHER, SPORT)))
                .containsExactly("Neue Einheiten im Kurs: Lebensmittel & Markt, Kochen & Rezepte und 2 weitere");
    }

    @Test
    void listsAllNewUnitsInTheDetails() {
        LearningPlan after = revise(before, curriculumWith(Level.A1_3, MARKET, COOKING, WEATHER, SPORT));

        assertThat(CourseUpdate.between(before, after)).singleElement()
                .extracting(change -> change.details().get("unitIds"))
                .isEqualTo(List.of("a1_market", "a1_cooking", "a1_weather", "a1_sport"));
    }

    @Test
    void newUnitsBelowTheLearnersLevelChangeNothing() {
        LearningPlan onA1_3 = PlanFixtures.generator().generate(learner(Level.A1_3, 10), noMastery());
        Unit groceries = unit("a1_groceries", Level.A1_2, "Einkaufen", 4);

        LearningPlan after = generator(curriculumWith(Level.A1_2, groceries))
                .revise(onA1_3, learner(Level.A1_3, 10), noMastery(), List.of(), List.of());

        assertThat(CourseUpdate.between(onA1_3, after)).isEmpty();
    }

    @Test
    void anUnchangedCourseChangesNothing() {
        assertThat(CourseUpdate.between(before, revise(before, CURRICULUM))).isEmpty();
    }

    @Test
    void namesNewUnitsFirstAndThenTheUnitsThatLeftTheCourse() {
        List<Stage> withoutReview = curriculumWith(Level.A2_1, unit("a2_travel", Level.A2_1, "Reisen", 4)).stream()
                .map(stage -> new Stage(stage.level(), stage.title(),
                        stage.units().stream().filter(unit -> !unit.id().equals("a1_review")).toList()))
                .toList();

        assertThat(CourseUpdate.between(before, revise(before, withoutReview))).containsExactly(
                new PlanChange(PlanChangeKind.REPLANNED, "Neue Einheit im Kurs: Reisen", Map.of("unitIds", List.of("a2_travel"))),
                new PlanChange(PlanChangeKind.REPLANNED, "Einheit nicht mehr im Kurs: Wiederholung",
                        Map.of("unitIds", List.of("a1_review"))));
    }

    @Test
    void focusUnitsThatComeOrGoAreNoCourseChange() {
        LearningPlan withFocus = withUnits(before, Level.A1_2,
                new PlanUnit("focus_grammar.infinitive_1", "Fokus: Infinitiv me", PlanUnitStatus.PLANNED, 1, null));

        assertThat(CourseUpdate.between(before, withFocus)).isEmpty();
        assertThat(CourseUpdate.between(withFocus, before)).isEmpty();
    }

    private List<String> reasons(List<Stage> curriculum) {
        return CourseUpdate.between(before, revise(before, curriculum)).stream().map(PlanChange::reason).toList();
    }

    private static LearningPlan revise(LearningPlan plan, List<Stage> curriculum) {
        return generator(curriculum).revise(plan, learner(plan.startLevel(), 10), noMastery(), List.of(), List.of());
    }

    private static RuleBasedPlanGenerator generator(List<Stage> curriculum) {
        return new RuleBasedPlanGenerator(curriculum, LABELS, CLOCK, LESSONS_ONLY);
    }
}
