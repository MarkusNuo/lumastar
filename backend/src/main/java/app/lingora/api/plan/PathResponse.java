package app.lingora.api.plan;

import app.lingora.domain.Level;
import app.lingora.domain.PlanUnitStatus;
import app.lingora.domain.UnitColor;
import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Schema(description = "The learning path of the home screen (PRD 12.3): the plan up to C2 with the live progress")
public record PathResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level currentLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "C2") String targetLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int dailyGoalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Per CEFR band (A1 … C2) of the plan the "
                + "expected date by which it is done, e.g. {\"A2\": \"2026-11-10\"}")
        Map<String, LocalDate> estimates,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "From the current level up to C2.3")
        List<PathStage> stages) {

    public record PathStage(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level level,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The test at the end of the stage")
            Checkpoint checkpoint,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<PathUnit> units) {
    }

    public record Checkpoint(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "locked until checkpoints arrive (M4)")
            CheckpointStatus status) {
    }

    public enum CheckpointStatus {
        LOCKED("locked"),
        AVAILABLE("available"),
        PASSED("passed");

        private final String code;

        CheckpointStatus(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    @Schema(description = "A node group of the path: a curriculum unit or an inserted focus unit")
    public record PathUnit(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Start its lessons with POST /api/lessons")
            String unitId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            @Schema(description = "Banner colour; absent for focus units") UnitColor color,
            @Schema(description = "Free icon key; \"target\" for focus units") String icon,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Live status: in_progress is the first "
                    + "unit that is neither completed nor skipped and has exercises") PlanUnitStatus status,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "A focus unit for a weak skill tag")
            boolean focus,
            @Schema(description = "Why the plan skipped, shortened or inserted the unit, in German") String reason,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int estimatedLessons,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "At most estimatedLessons")
            int lessonsCompleted,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                    description = "false while the unit has no exercises yet; it cannot be started") boolean hasContent) {
    }
}
