package app.lumastar.core.reminder;

import app.lumastar.core.progress.StreakRule;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * The learner's day as {@link ReminderPolicy} sees it.
 *
 * @param goalMet the daily goal is met today
 * @param streak  the streak as it stands today ({@link StreakRule#status})
 * @param sent    the reminders sent today, each kind at most once
 */
public record ReminderDay(boolean goalMet, StreakRule.Status streak, List<SentReminder> sent) {

    public ReminderDay {
        Objects.requireNonNull(streak, "streak");
        sent = List.copyOf(sent);
        if (sent.stream().map(SentReminder::kind).distinct().count() < sent.size()) {
            throw new IllegalArgumentException("each kind of reminder is recorded once a day: " + sent);
        }
    }

    public Optional<SentReminder> sent(Reminder kind) {
        return sent.stream().filter(reminder -> reminder.kind() == kind).findFirst();
    }

    boolean wasSent(Reminder kind) {
        return sent(kind).isPresent();
    }

    boolean isSnoozeDue(Reminder kind, Instant now) {
        return sent(kind).filter(reminder -> reminder.isSnoozeDue(now)).isPresent();
    }
}
