package app.lumastar.api.reminder;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.core.progress.DailyGoal;
import app.lumastar.core.reminder.Reminder;
import app.lumastar.push.NotificationAction;
import app.lumastar.push.NotificationKind;
import app.lumastar.push.PushNotification;
import app.lumastar.push.PushSetup;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ReminderNotificationsTest {

    @Test
    void theBadgeShowsTheDueCardsOrTheOpenGoal() {
        DailyGoal open = new DailyGoal(0, 10);

        assertThat(ReminderNotifications.of(Reminder.DAILY_REMINDER, 3, open, 34, Optional.empty()).badgeCount()).isEqualTo(34);
        assertThat(ReminderNotifications.of(Reminder.DAILY_REMINDER, 3, open, 0, Optional.empty()).badgeCount()).isOne();
    }

    @Test
    void offersTheSnoozeWithItsToken() {
        PushNotification rescue = ReminderNotifications.of(Reminder.STREAK_AT_RISK, 3, new DailyGoal(0, 10), 0,
                Optional.of("token"));

        assertThat(rescue.kind()).isEqualTo(NotificationKind.STREAK_AT_RISK);
        assertThat(rescue.actions()).isEqualTo(List.of(
                new NotificationAction(NotificationAction.Type.PRACTISE, "Jetzt üben"),
                new NotificationAction(NotificationAction.Type.SNOOZE, "In 1 Stunde")));
        assertThat(rescue.snoozeToken()).isEqualTo("token");
        assertThat(rescue.icon()).isEqualTo("/icons/icon-192.png");
    }

    @Test
    void theJobDoesNothingWithoutWebPush() {
        DueReminders withoutPush = new DueReminders(PushSetup.disabled(), null, null, null, null, null, null,
                Clock.systemUTC());

        assertThat(withoutPush.sendDue()).isEmpty();
    }
}
