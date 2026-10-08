package app.lingora.api.streak;

import app.lingora.core.progress.StreakGoalRule;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "The streak goal on the ladder 10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 365, 465, 565, … days. "
        + "A reached goal stays until the next one is chosen from the options; a broken streak keeps the goal and starts "
        + "its progress again.")
public record StreakGoalResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The goal in days", example = "10") int target,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The current streak, at most the target")
        int progress,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean reached,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Once reached: the next three rungs above the "
                + "goal (or above the streak, if it has run past them), ascending; empty before") List<Integer> options) {

    static StreakGoalResponse of(StreakGoalRule.Status goal) {
        return new StreakGoalResponse(goal.target(), goal.progress(), goal.reached(), goal.options());
    }
}
