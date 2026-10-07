package app.lingora.core.reminder;

import java.time.Instant;
import java.util.Objects;

/**
 * A reminder sent today.
 *
 * @param snoozedUntil when the learner wants it again ("In 1 Stunde"); {@code null} unless snoozed and not yet sent
 *                     again
 */
public record SentReminder(Reminder kind, Instant snoozedUntil) {

    public SentReminder {
        Objects.requireNonNull(kind, "kind");
        if (kind == Reminder.NONE) {
            throw new IllegalArgumentException("NONE is never sent");
        }
    }

    /** The snooze has run out and is at most {@link ReminderPolicy#MAX_DELAY} late. */
    public boolean isSnoozeDue(Instant now) {
        return snoozedUntil != null && !now.isBefore(snoozedUntil) && now.isBefore(snoozedUntil.plus(ReminderPolicy.MAX_DELAY));
    }
}
