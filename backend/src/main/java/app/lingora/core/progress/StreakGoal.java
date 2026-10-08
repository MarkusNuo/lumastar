package app.lingora.core.progress;

import java.time.LocalDate;

/**
 * The streak length the learner aims at, a rung of the {@link StreakGoalLadder}.
 *
 * @param reachedOn the day whose extension of the streak reached the target; {@code null} before
 */
public record StreakGoal(int target, LocalDate reachedOn) {

    public static final StreakGoal FIRST = new StreakGoal(StreakGoalLadder.FIRST, null);

    public StreakGoal {
        if (!StreakGoalLadder.isRung(target)) {
            throw new IllegalArgumentException("a streak goal of %d days is no rung of the ladder".formatted(target));
        }
    }

    public static StreakGoal chosen(int target) {
        return new StreakGoal(target, null);
    }
}
