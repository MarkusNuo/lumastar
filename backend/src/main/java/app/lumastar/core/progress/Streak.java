package app.lumastar.core.progress;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * The streak as stored: {@code current} days in a row with the daily goal met, the last of them
 * {@code lastActiveDate}. A gap since then is judged by {@link StreakRule} when the streak is read. Every ISO week has
 * {@link StreakRule#FREEZES_PER_WEEK} streak freeze; {@code freezesLeftInWeek} is what is left of it in the week
 * starting on Monday {@code freezeWeek}, every other week still has its full freeze.
 *
 * @param lastActiveDate {@code null} before the goal was met for the first time
 * @param freezeWeek     {@code null} before a freeze was used for the first time
 */
public record Streak(int current, int longest, LocalDate lastActiveDate, LocalDate freezeWeek, int freezesLeftInWeek) {

    public static final Streak NONE = new Streak(0, 0, null, null, StreakRule.FREEZES_PER_WEEK);

    public Streak {
        if (current < 0 || longest < current) {
            throw new IllegalArgumentException("the streak (%d) must not be negative or longer than the longest (%d)"
                    .formatted(current, longest));
        }
        if (freezesLeftInWeek < 0 || freezesLeftInWeek > StreakRule.FREEZES_PER_WEEK) {
            throw new IllegalArgumentException("freezes left (%d) must be between 0 and %d"
                    .formatted(freezesLeftInWeek, StreakRule.FREEZES_PER_WEEK));
        }
        if (freezeWeek != null && freezeWeek.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("a freeze week starts on a Monday, found " + freezeWeek);
        }
    }

    /** The freezes left in the ISO week of {@code day}; they are not carried over from week to week. */
    public int freezesLeft(LocalDate day) {
        return weekOf(day).equals(freezeWeek) ? freezesLeftInWeek : StreakRule.FREEZES_PER_WEEK;
    }

    /** Uses a freeze of the ISO week of {@code day}. */
    Streak withFreezeUsedOn(LocalDate day) {
        int left = freezesLeft(day);
        if (left == 0) {
            throw new IllegalStateException("the week of %s has no freeze left".formatted(day));
        }
        return new Streak(current, longest, lastActiveDate, weekOf(day), left - 1);
    }

    static LocalDate weekOf(LocalDate day) {
        return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
}
