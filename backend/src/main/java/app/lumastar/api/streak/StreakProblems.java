package app.lumastar.api.streak;

import app.lumastar.api.error.ApiProblemException;
import app.lumastar.core.progress.StreakGoalRule;
import org.springframework.http.HttpStatus;

/** The expected errors of the streak API with their stable problem codes. */
final class StreakProblems {

    private StreakProblems() {
    }

    static ApiProblemException invalidGoal(int target, StreakGoalRule.Status goal, int streak) {
        String allowed = goal.reached()
                ? "one of %s".formatted(goal.options())
                : "a rung of the goal ladder above the current streak of %d days".formatted(streak);
        return new ApiProblemException(HttpStatus.BAD_REQUEST, "invalid_streak_goal",
                "A streak goal of %d days cannot be chosen now; choose %s.".formatted(target, allowed));
    }
}
