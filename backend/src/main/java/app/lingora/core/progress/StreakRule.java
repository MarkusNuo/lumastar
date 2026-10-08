package app.lingora.core.progress;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Optional;

/**
 * The streak rule of PRD F9. A day counts when the daily goal is met; meeting it extends the streak once per day.
 * A single missed day is bridged by the streak freeze of its ISO week ({@value #FREEZES_PER_WEEK} per week, not
 * carried over), two or more missed days in a row end the streak. Days are dates in the learner's time zone.
 * <p>
 * The rule is applied lazily: {@link #status} judges the stored streak on any day without changing it, and
 * {@link #extend} stores the extension when the goal is met. A freeze is only used up when it actually carries the
 * streak on, i.e. when the goal is met again on the day after the missed one; if that day is missed as well, the
 * streak ends and the freeze stays.
 */
public final class StreakRule {

    public static final int FREEZES_PER_WEEK = 1;

    private StreakRule() {
    }

    /**
     * The streak as it stands on {@code today}.
     *
     * @param current          0 once the streak has ended
     * @param freezesLeft      the freezes left in the ISO week of {@code today}, a freeze bridging yesterday deducted
     * @param extendedToday    the goal has been met today
     * @param bridgesYesterday yesterday was missed and the freeze of its week carries the streak until today ends
     */
    public record Status(int current, int longest, int freezesLeft, boolean extendedToday, LocalDate lastActiveDate,
                         boolean bridgesYesterday) {
    }

    /**
     * @param extended   whether the streak grew; {@code false} if the goal had been met today already
     * @param bridgedDay the missed day a freeze was used for
     */
    public record Extension(Streak streak, boolean extended, Optional<LocalDate> bridgedDay) {
    }

    public static Status status(Streak streak, LocalDate today) {
        LocalDate last = streak.lastActiveDate();
        if (last == null) {
            return new Status(0, streak.longest(), streak.freezesLeft(today), false, null, false);
        }
        long gap = ChronoUnit.DAYS.between(last, today);
        if (gap <= 1) {
            // A negative gap means the time zone moved west after the goal was met: that day still counts as today.
            return new Status(streak.current(), streak.longest(), streak.freezesLeft(today), gap <= 0, last, false);
        }
        LocalDate yesterday = today.minusDays(1);
        if (gap == 2 && streak.freezesLeft(yesterday) > 0) {
            Streak bridged = streak.withFreezeUsedOn(yesterday);
            return new Status(streak.current(), streak.longest(), bridged.freezesLeft(today), false, last, true);
        }
        return new Status(0, streak.longest(), streak.freezesLeft(today), false, last, false);
    }

    /** The day the next ISO week starts with a new freeze: the Monday after {@code today}. */
    public static LocalDate freezesResetOn(LocalDate today) {
        return today.with(TemporalAdjusters.next(DayOfWeek.MONDAY));
    }

    /** The streak after the daily goal has been met on {@code today}. */
    public static Extension extend(Streak streak, LocalDate today) {
        LocalDate last = streak.lastActiveDate();
        if (last != null && !last.isBefore(today)) {
            return new Extension(streak, false, Optional.empty());
        }
        long gap = last == null ? Long.MAX_VALUE : ChronoUnit.DAYS.between(last, today);
        LocalDate yesterday = today.minusDays(1);
        Streak before = streak;
        Optional<LocalDate> bridgedDay = Optional.empty();
        int current = 1;
        if (gap == 1) {
            current = streak.current() + 1;
        } else if (gap == 2 && streak.freezesLeft(yesterday) > 0) {
            before = streak.withFreezeUsedOn(yesterday);
            bridgedDay = Optional.of(yesterday);
            current = streak.current() + 1;
        }
        Streak extended = new Streak(current, Math.max(streak.longest(), current), today, before.freezeWeek(),
                before.freezesLeftInWeek());
        return new Extension(extended, true, bridgedDay);
    }
}
