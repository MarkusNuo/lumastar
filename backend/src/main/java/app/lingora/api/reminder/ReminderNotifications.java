package app.lingora.api.reminder;

import app.lingora.core.progress.DailyGoal;
import app.lingora.core.reminder.Reminder;
import app.lingora.core.reminder.ReminderMessage;
import app.lingora.core.reminder.ReminderMessages;
import app.lingora.push.NotificationAction;
import app.lingora.push.NotificationKind;
import app.lingora.push.PushNotification;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** The push payload of a reminder: its text, the actions "Jetzt üben" and, while possible today, "In 1 Stunde". */
final class ReminderNotifications {

    private ReminderNotifications() {
    }

    /**
     * @param dueCards    review cards due now, the app badge; 1 if none, since the daily goal is open
     * @param snoozeToken present if the notification offers the snooze
     */
    static PushNotification of(Reminder reminder, int streakDays, DailyGoal goal, int dueCards, Optional<String> snoozeToken) {
        ReminderMessage message = ReminderMessages.of(reminder, streakDays, goal);
        List<NotificationAction> actions = new ArrayList<>();
        actions.add(new NotificationAction(NotificationAction.Type.PRACTISE, ReminderMessages.PRACTISE_ACTION));
        snoozeToken.ifPresent(token -> actions.add(new NotificationAction(NotificationAction.Type.SNOOZE,
                ReminderMessages.SNOOZE_ACTION)));
        return PushNotification.of(kind(reminder), message.title(), message.body(), PushNotification.HOME, actions,
                Math.max(1, dueCards), snoozeToken.orElse(null));
    }

    private static NotificationKind kind(Reminder reminder) {
        return switch (reminder) {
            case DAILY_REMINDER -> NotificationKind.DAILY_REMINDER;
            case STREAK_AT_RISK -> NotificationKind.STREAK_AT_RISK;
            case NONE -> throw new IllegalArgumentException("NONE is never sent");
        };
    }
}
