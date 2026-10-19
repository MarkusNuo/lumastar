package app.lumastar.core.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.lumastar.domain.LearningPlan.PlanStage;
import app.lumastar.domain.LearningPlan.PlanUnit;
import app.lumastar.domain.Level;
import app.lumastar.domain.PlanUnitStatus;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class StageProgressTest {

    private static final Set<String> WITH_CONTENT = Set.of("a1_food", "a1_home", "a1_family", "focus_vocab.food_1");

    @Test
    void countsTheCompletedAndSkippedUnitsWithExercises() {
        PlanStage stage = stage(unit("a1_food", PlanUnitStatus.COMPLETED), unit("a1_home", PlanUnitStatus.SKIPPED),
                unit("a1_family", PlanUnitStatus.IN_PROGRESS));

        StageProgress progress = StageProgress.of(stage, WITH_CONTENT);

        assertThat(progress).isEqualTo(new StageProgress(1, 1, 3));
        assertThat(progress.done()).isEqualTo(2);
        assertThat(progress.percent()).isEqualTo(66);
        assertThat(progress.isComplete()).isFalse();
    }

    @Test
    void leavesOutFocusUnitsAndUnitsWithoutExercises() {
        PlanStage stage = stage(unit("a1_food", PlanUnitStatus.COMPLETED), unit("focus_vocab.food_1", PlanUnitStatus.PLANNED),
                unit("a1_skeleton", PlanUnitStatus.PLANNED));

        StageProgress progress = StageProgress.of(stage, WITH_CONTENT);

        assertThat(progress).isEqualTo(new StageProgress(1, 0, 1));
        assertThat(progress.percent()).isEqualTo(100);
        assertThat(progress.isComplete()).isTrue();
    }

    @Test
    void aStageWithoutExercisesIsNeverComplete() {
        StageProgress progress = StageProgress.of(stage(unit("b1_opinions", PlanUnitStatus.COMPLETED)), WITH_CONTENT);

        assertThat(progress).isEqualTo(new StageProgress(0, 0, 0));
        assertThat(progress.percent()).isZero();
        assertThat(progress.isComplete()).isFalse();
    }

    @Test
    void rejectsMoreDoneUnitsThanTheStageHas() {
        assertThatIllegalArgumentException().isThrownBy(() -> new StageProgress(2, 1, 2));
    }

    private static PlanStage stage(PlanUnit... units) {
        return new PlanStage(Level.A1_2, List.of(units));
    }

    private static PlanUnit unit(String unitId, PlanUnitStatus status) {
        return new PlanUnit(unitId, "Einheit " + unitId, status, 4, null);
    }
}
