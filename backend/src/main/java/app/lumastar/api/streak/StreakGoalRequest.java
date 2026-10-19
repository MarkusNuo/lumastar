package app.lumastar.api.streak;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "The next streak goal: once the goal is reached, one of its options; before, any rung of the ladder "
        + "above the current streak")
public record StreakGoalRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The goal in days", example = "20")
        @NotNull Integer target) {
}
