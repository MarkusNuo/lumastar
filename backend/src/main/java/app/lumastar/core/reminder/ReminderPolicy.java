package app.lumastar.core.reminder;

import app.lumastar.core.progress.StreakRule;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.Optional;

/**
 * When a learner gets a reminder by web push (PRD F9). Nothing is sent once today's goal is met. The daily reminder
 * comes at the learner's time; the streak rescue comes at the later rescue time, but only while missing today would end
 * the streak. Each kind comes at most once a day, plus once more whenever the learner snoozes it; after the rescue the
 * daily reminder never comes again that day.
 * <p>
 * Reminder times are wall-clock times of the learner's time zone, so a reminder at 19:00 stays at 19:00 across DST
 * changes; one set inside the hour skipped in spring comes right after it. A reminder more than {@link #MAX_DELAY} late,
 * e.g. after the server was down, is skipped: a late notification, perhaps at night, disturbs more than it helps.
 */
public final class ReminderPolicy {

    public static final Duration MAX_DELAY = Duration.ofHours(1);
    /** The snooze of the notification action "In 1 Stunde". */
    public static final Duration SNOOZE = Duration.ofHours(1);

    private ReminderPolicy() {
    }

    /** @param now the current time in the learner's time zone */
    public static Reminder decide(ZonedDateTime now, ReminderSettings settings, ReminderDay day) {
        if (!settings.enabled() || day.goalMet() || day.streak().extendedToday()) {
            return Reminder.NONE;
        }
        LocalDateTime localNow = now.toLocalDateTime();
        Instant instant = now.toInstant();
        boolean rescueSent = day.wasSent(Reminder.STREAK_AT_RISK);
        if (settings.rescueEnabled() && isAtRisk(day.streak())
                && (!rescueSent && isDue(localNow, settings.rescueTime()) || day.isSnoozeDue(Reminder.STREAK_AT_RISK, instant))) {
            return Reminder.STREAK_AT_RISK;
        }
        if (!rescueSent && (day.sent().isEmpty() && isDue(localNow, settings.time())
                || day.isSnoozeDue(Reminder.DAILY_REMINDER, instant))) {
            return Reminder.DAILY_REMINDER;
        }
        return Reminder.NONE;
    }

    /**
     * Missing today would end the streak: it is running, today has not extended it, and no streak freeze would bridge
     * today, because this week's freeze is used up or already bridges yesterday (a freeze bridges a single day only).
     */
    public static boolean isAtRisk(StreakRule.Status streak) {
        return streak.current() > 0 && !streak.extendedToday() && (streak.bridgesYesterday() || streak.freezesLeft() == 0);
    }

    /**
     * When a reminder snoozed now by {@code snooze} comes again; empty if that is no longer today, since a reminder is
     * about today's goal.
     */
    public static Optional<Instant> snoozedUntil(ZonedDateTime now, Duration snooze) {
        ZonedDateTime until = now.plus(snooze);
        return until.isBefore(endOfDay(now)) ? Optional.of(until.toInstant()) : Optional.empty();
    }

    /**
     * How long a push service may hold a reminder for an unreachable device: no longer than a reminder may be late
     * ({@link #MAX_DELAY}), and never into the next day.
     */
    public static Duration timeToLive(ZonedDateTime now) {
        Duration untilMidnight = Duration.between(now, endOfDay(now));
        return untilMidnight.compareTo(MAX_DELAY) < 0 ? untilMidnight : MAX_DELAY;
    }

    public static ZonedDateTime endOfDay(ZonedDateTime now) {
        return now.toLocalDate().plusDays(1).atStartOfDay(now.getZone());
    }

    private static boolean isDue(LocalDateTime now, LocalTime time) {
        LocalDateTime at = now.toLocalDate().atTime(time);
        return !now.isBefore(at) && now.isBefore(at.plus(MAX_DELAY));
    }
}
