package app.lingora.core.progress;

import java.util.List;
import java.util.stream.Stream;

/**
 * The rungs a streak goal can take: 10, 20, 30, 50, 75, 100, 150, 200, 250, 300 and 365 days, then every
 * {@value #STEP_AFTER_A_YEAR} days more (465, 565, …). Every learner starts with {@value #FIRST}.
 */
public final class StreakGoalLadder {

    public static final int FIRST = 10;

    private static final List<Integer> FIXED_RUNGS = List.of(FIRST, 20, 30, 50, 75, 100, 150, 200, 250, 300, 365);
    private static final int A_YEAR = 365;
    private static final int STEP_AFTER_A_YEAR = 100;

    private StreakGoalLadder() {
    }

    public static boolean isRung(int days) {
        return FIXED_RUNGS.contains(days) || days > A_YEAR && (days - A_YEAR) % STEP_AFTER_A_YEAR == 0;
    }

    /** The lowest rung above {@code days}. */
    public static int rungAbove(int days) {
        if (days < A_YEAR) {
            return FIXED_RUNGS.stream().filter(rung -> rung > days).findFirst().orElseThrow();
        }
        return A_YEAR + ((days - A_YEAR) / STEP_AFTER_A_YEAR + 1) * STEP_AFTER_A_YEAR;
    }

    /** The {@code count} lowest rungs above {@code days}, in ascending order. */
    public static List<Integer> rungsAbove(int days, int count) {
        return Stream.iterate(rungAbove(days), StreakGoalLadder::rungAbove).limit(count).toList();
    }
}
