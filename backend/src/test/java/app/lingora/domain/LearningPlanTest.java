package app.lingora.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class LearningPlanTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private static final LearningPlan PLAN = new LearningPlan(Instant.parse("2026-09-25T10:05:00Z"), "rule_based_v1", Level.A1_2,
            List.of(new PlanStage(Level.A1_2, List.of(
                    new PlanUnit("a1_u04", "Zuhause", PlanUnitStatus.IN_PROGRESS, 6, null),
                    new PlanUnit("focus_grammar.infinitive_1", "Fokus: me + Partizip", PlanUnitStatus.PLANNED, 1,
                            "Fehlerquote 67 % bei grammar.infinitive")))),
            Map.of(CefrBand.C2, LocalDate.parse("2029-06-01"), CefrBand.A2, LocalDate.parse("2026-11-10"),
                    CefrBand.B1, LocalDate.parse("2027-04-01")));

    @Test
    void serialisesToTheShapeOfLearningPlanJson() {
        assertThat(JSON.writeValueAsString(PLAN)).isEqualTo("""
                {"generatedAt":"2026-09-25T10:05:00Z","generatedBy":"rule_based_v1","startLevel":"A1.2","stages":[\
                {"level":"A1.2","units":[{"unitId":"a1_u04","title":"Zuhause","status":"in_progress","estimatedLessons":6},\
                {"unitId":"focus_grammar.infinitive_1","title":"Fokus: me + Partizip","status":"planned","estimatedLessons":1,\
                "reason":"Fehlerquote 67 % bei grammar.infinitive"}]}],\
                "estimates":{"A2":"2026-11-10","B1":"2027-04-01","C2":"2029-06-01"}}""");
    }

    @Test
    void readsItsJsonBack() {
        assertThat(JSON.readValue(JSON.writeValueAsString(PLAN), LearningPlan.class)).isEqualTo(PLAN);
    }

    @Test
    void findsUnitsInPathOrder() {
        assertThat(PLAN.units().map(PlanUnit::unitId)).containsExactly("a1_u04", "focus_grammar.infinitive_1");
        assertThat(PLAN.unit("focus_grammar.infinitive_1").map(PlanUnit::isFocus)).contains(true);
        assertThat(PLAN.unit("a1_u05")).isEmpty();
    }

    @Test
    void rejectsAUnitListedTwice() {
        PlanUnit unit = new PlanUnit("a1_u04", "Zuhause", PlanUnitStatus.PLANNED, 6, null);

        assertThatIllegalArgumentException().isThrownBy(() -> new LearningPlan(Instant.EPOCH, "rule_based_v1", Level.A1_2,
                List.of(new PlanStage(Level.A1_2, List.of(unit)), new PlanStage(Level.A1_3, List.of(unit))), Map.of()));
    }

    @Test
    void focusUnitIdsNameTheirSkillTagAndNumber() {
        FocusUnitId id = new FocusUnitId(SkillTag.of("grammar.verbs.infinitive_me"), 2);

        assertThat(id.id()).isEqualTo("focus_grammar.verbs.infinitive_me_2");
        assertThat(FocusUnitId.parse(id.id())).contains(id);
        assertThat(FocusUnitId.parse("focus_vocab.numbers_1_12")).contains(new FocusUnitId(SkillTag.of("vocab.numbers_1"), 12));
    }

    @Test
    void curriculumUnitsAndMalformedIdsAreNoFocusUnits() {
        assertThat(FocusUnitId.parse("a1_u04_family")).isEmpty();
        assertThat(FocusUnitId.parse("focus_infinitive_1")).as("no skill tag").isEmpty();
        assertThat(FocusUnitId.parse("focus_grammar.infinitive")).as("no number").isEmpty();
        assertThat(FocusUnitId.parse("focus_grammar.infinitive_0")).isEmpty();
        assertThat(FocusUnitId.isFocus("focus_grammar.infinitive_1")).isTrue();
    }
}
