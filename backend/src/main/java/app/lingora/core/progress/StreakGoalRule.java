package app.lingora.core.progress;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * The streak goal (DECISIONS #98). The goal is reached once the streak is as long as its target. It stays reached, even if
 * the streak breaks, until the learner chooses one of the {@value #OPTIONS} next rungs of the {@link StreakGoalLadder};
 * before that, the learner may change it to any rung above the current streak. The progress is the current streak up to
 * the target, so a broken streak keeps the goal and starts its progress again.
 */
public final class StreakGoalRule {

    public static final int OPTIONS = 3;

    private StreakGoalRule() {
    }

    /** @param options the goals the learner may choose next, ascending; empty until the goal is reached */
    public record Status(int target, int progress, boolean reached, List<Integer> options) {
    }

    public static Status status(StreakGoal goal, int streak) {
        boolean reached = goal.reachedOn() != null || streak >= goal.target();
        // A streak that has run past further rungs before the learner chose only offers goals still ahead of it.
        List<Integer> options = reached ? StreakGoalLadder.rungsAbove(Math.max(goal.target(), streak), OPTIONS) : List.of();
        return new Status(goal.target(), Math.min(streak, goal.target()), reached, options);
    }

    /**
     * The goal as reached on {@code day}, when the streak was extended to {@code streak} days; empty if it had been
     * reached before or is still ahead.
     */
    public static Optional<StreakGoal> reachedBy(StreakGoal goal, int streak, LocalDate day) {
        if (goal.reachedOn() != null || streak < goal.target()) {
            return Optional.empty();
        }
        return Optional.of(new StreakGoal(goal.target(), day));
    }

    /** Whether the learner may choose {@code target} as the goal while the streak is {@code streak} days long. */
    public static boolean mayChoose(StreakGoal goal, int streak, int target) {
        Status status = status(goal, streak);
        if (status.reached()) {
            return status.options().contains(target);
        }
        return StreakGoalLadder.isRung(target) && target > streak;
    }
}
