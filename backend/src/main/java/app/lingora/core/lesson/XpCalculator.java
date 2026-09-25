package app.lingora.core.lesson;

import java.time.Duration;
import java.util.List;
import java.util.Objects;

/**
 * XP of a finished lesson (PRD F9): a base amount, a bonus if every first attempt counted as correct and a bonus if
 * the median first-attempt response time is at most {@link #SPEED_LIMIT}. Retries at the end of a lesson do not count.
 */
public final class XpCalculator {

    public static final int BASE_XP = 10;
    public static final int PERFECT_BONUS = 5;
    public static final int SPEED_BONUS = 5;
    public static final Duration SPEED_LIMIT = Duration.ofSeconds(8);

    /** The first answer to one exercise of the lesson. */
    public record FirstAttempt(boolean countsAsCorrect, Duration responseTime) {

        public FirstAttempt {
            Objects.requireNonNull(responseTime, "responseTime");
        }
    }

    /** XP of a lesson by source; {@link #total()} is what the learner earns. */
    public record LessonXp(int base, int perfectBonus, int speedBonus) {

        public int total() {
            return base + perfectBonus + speedBonus;
        }
    }

    private XpCalculator() {
    }

    public static LessonXp calculate(List<FirstAttempt> firstAttempts) {
        if (firstAttempts.isEmpty()) {
            throw new IllegalArgumentException("a lesson has at least one exercise");
        }
        boolean perfect = firstAttempts.stream().allMatch(FirstAttempt::countsAsCorrect);
        boolean fast = median(firstAttempts.stream().map(FirstAttempt::responseTime).toList()).compareTo(SPEED_LIMIT) <= 0;
        return new LessonXp(BASE_XP, perfect ? PERFECT_BONUS : 0, fast ? SPEED_BONUS : 0);
    }

    static Duration median(List<Duration> durations) {
        List<Duration> sorted = durations.stream().sorted().toList();
        int middle = sorted.size() / 2;
        return sorted.size() % 2 == 1
                ? sorted.get(middle)
                : sorted.get(middle - 1).plus(sorted.get(middle)).dividedBy(2);
    }
}
