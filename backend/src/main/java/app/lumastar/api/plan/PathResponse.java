package app.lumastar.api.plan;

import app.lumastar.domain.CheckpointStatus;
import app.lumastar.domain.Level;
import app.lumastar.domain.PlanUnitStatus;
import app.lumastar.domain.UnitColor;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Schema(description = "The learning path of the home screen: the plan up to C2 with the live progress")
public record PathResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level currentLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "C2") String targetLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int dailyGoalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Per CEFR band (A1 … C2) of the plan the "
                + "expected date by which it is done, e.g. {\"A2\": \"2026-11-10\"}")
        Map<String, LocalDate> estimates,
        @Schema(description = "The stage passed last below the current level, to show collapsed with its trophy above "
                + "the first stage; absent until a checkpoint below the current level is passed")
        PassedStage previousStage,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "From the current level up to C2.3")
        List<PathStage> stages) {

    @Schema(description = "A stage whose checkpoint the learner has passed")
    public record PassedStage(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level level,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "When the checkpoint was passed")
            Instant passedAt,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "0.87", description = "The share of correct "
                    + "first answers in the checkpoint") double accuracy) {
    }

    public record PathStage(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level level,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The test at the end of the stage")
            Checkpoint checkpoint,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<PathUnit> units) {
    }

    public record Checkpoint(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "available once every curriculum unit of "
                    + "the stage that has exercises is completed or skipped; start it with POST /api/checkpoints")
            CheckpointStatus status,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0", example = "15", description = "The "
                    + "exercises the checkpoint will have: 15, or all exercises of the stage if it has fewer")
            int exerciseCount,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "0.8", description = "The share of first "
                    + "answers that must be correct to pass")
            double requiredAccuracy) {
    }

    @Schema(description = "A node group of the path: a curriculum unit or an inserted focus unit")
    public record PathUnit(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Start its lessons with POST /api/lessons")
            String unitId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            @Schema(description = "Banner colour; absent for focus units") UnitColor color,
            @Schema(description = "Free icon key; \"target\" for focus units") String icon,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Live status: in_progress is the first "
                    + "curriculum unit that is neither completed nor skipped and has exercises; a focus unit is never "
                    + "in_progress") PlanUnitStatus status,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "A focus unit for a weak skill tag: "
                    + "optional extra practice that can be played at once and holds back neither later units nor the "
                    + "checkpoint")
            boolean focus,
            @Schema(description = "Why the plan skipped, shortened or inserted the unit, in German") String reason,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int estimatedLessons,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "At most estimatedLessons")
            int lessonsCompleted,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                    description = "false while the unit has no exercises yet; it cannot be started") boolean hasContent) {
    }
}
