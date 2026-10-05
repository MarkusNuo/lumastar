package app.lingora.core.plan;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.domain.CheckpointStatus;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.Level;
import app.lingora.domain.PlanUnitStatus;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class CheckpointRuleTest {

    private static final Set<String> WITH_CONTENT = Set.of("a1_food", "a1_home");

    @Test
    void opensWhenEveryUnitWithExercisesIsCompletedOrSkipped() {
        PlanStage stage = stage(unit("a1_food", PlanUnitStatus.COMPLETED), unit("a1_home", PlanUnitStatus.SKIPPED),
                unit("a1_skeleton", PlanUnitStatus.PLANNED));

        assertThat(CheckpointRule.status(stage, WITH_CONTENT, false)).isEqualTo(CheckpointStatus.AVAILABLE);
    }

    @Test
    void staysLockedWhileAUnitWithExercisesIsToDo() {
        PlanStage stage = stage(unit("a1_food", PlanUnitStatus.COMPLETED), unit("a1_home", PlanUnitStatus.IN_PROGRESS));

        assertThat(CheckpointRule.status(stage, WITH_CONTENT, false)).isEqualTo(CheckpointStatus.LOCKED);
    }

    @Test
    void aStageWithoutExercisesStaysLocked() {
        PlanStage stage = stage(unit("b1_opinions", PlanUnitStatus.COMPLETED));

        assertThat(CheckpointRule.status(stage, WITH_CONTENT, false)).isEqualTo(CheckpointStatus.LOCKED);
    }

    @Test
    void openFocusUnitsDoNotHoldItBack() {
        PlanStage stage = stage(unit("a1_food", PlanUnitStatus.COMPLETED), unit("a1_home", PlanUnitStatus.COMPLETED),
                unit("focus_vocab.food_1", PlanUnitStatus.PLANNED));

        assertThat(CheckpointRule.status(stage, Set.of("a1_food", "a1_home", "focus_vocab.food_1"), false))
                .isEqualTo(CheckpointStatus.AVAILABLE);
    }

    @Test
    void aPassedCheckpointStaysPassed() {
        PlanStage stage = stage(unit("a1_food", PlanUnitStatus.PLANNED));

        assertThat(CheckpointRule.status(stage, WITH_CONTENT, true)).isEqualTo(CheckpointStatus.PASSED);
    }

    @Test
    void passesWithEightyPercent() {
        assertThat(CheckpointRule.passes(0.8)).isTrue();
        assertThat(CheckpointRule.passes(0.799)).isFalse();
    }

    private static PlanStage stage(PlanUnit... units) {
        return new PlanStage(Level.A1_2, List.of(units));
    }

    private static PlanUnit unit(String unitId, PlanUnitStatus status) {
        return new PlanUnit(unitId, "Einheit " + unitId, status, 4, null);
    }
}
