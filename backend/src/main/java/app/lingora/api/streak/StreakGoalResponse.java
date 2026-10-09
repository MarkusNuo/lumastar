package app.lingora.api.streak;

import app.lingora.core.progress.StreakGoalRule;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "The streak goal on the ladder 10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 365, 465, 565, … days. "
        + "A reached goal stays complete until the next one is chosen from the options, even if the streak breaks; a "
        + "goal still ahead keeps its target when the streak breaks and starts its progress again.")
public record StreakGoalResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The goal in days", example = "10") int target,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The current streak while the goal is ahead; "
                + "the target once it is reached, even if the streak has broken since")
        int progress,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean reached,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The goals that can be chosen now, ascending. "
                + "Once reached: the next three rungs above the goal (or above the streak, if it has run past them), the "
                + "only goals PUT /api/streak/goal accepts then. Before: the first three rungs above the current streak "
                + "other than the goal itself, e.g. 20, 30, 50 for the first goal of 10 days; PUT /api/streak/goal also "
                + "accepts any other rung above the streak then.") List<Integer> options) {

    static StreakGoalResponse of(StreakGoalRule.Status goal) {
        return new StreakGoalResponse(goal.target(), goal.progress(), goal.reached(), goal.options());
    }
}
