package app.lingora.api.progress;

import app.lingora.core.progress.StreakGoalRule;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "A streak goal just reached, with the next goals to choose from (PUT /api/streak/goal)")
public record StreakGoalReached(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The goal reached, in days", example = "10")
        int target,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The next three rungs of the goal ladder above "
                + "the reached goal (or above the streak, if it has run past them), ascending, e.g. 20, 30, 50")
        List<Integer> options) {

    static StreakGoalReached of(StreakGoalRule.Status reached) {
        return new StreakGoalReached(reached.target(), reached.options());
    }
}
