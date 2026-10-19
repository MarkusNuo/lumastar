package app.lumastar.core.reminder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lumastar.core.progress.DailyGoal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class ReminderMessagesTest {

    private static final DailyGoal NOTHING_YET = new DailyGoal(0, 10);

    @Test
    void theDailyReminderNamesTheStreakThatWaits() {
        assertThat(ReminderMessages.of(Reminder.DAILY_REMINDER, 12, NOTHING_YET))
                .isEqualTo(new ReminderMessage("Zeit für Gheg! 🔥", "Dein 12-Tage-Streak wartet auf dich."));
        assertThat(ReminderMessages.of(Reminder.DAILY_REMINDER, 1, NOTHING_YET))
                .isEqualTo(new ReminderMessage("Zeit für Gheg! 🔥", "Dein Streak wartet auf dich."));
    }

    @Test
    void theDailyReminderWithoutStreakNamesTheGoal() {
        assertThat(ReminderMessages.of(Reminder.DAILY_REMINDER, 0, new DailyGoal(0, 5)))
                .isEqualTo(new ReminderMessage("Zeit für Gheg!", "5 Minuten reichen für dein Tagesziel."));
    }

    @Test
    void theDailyReminderCountsTheMinutesLeftOnceTheLearnerHasStarted() {
        assertThat(ReminderMessages.of(Reminder.DAILY_REMINDER, 12, new DailyGoal(5, 10)))
                .isEqualTo(new ReminderMessage("Zeit für Gheg! 🔥", "Nur noch 5 Minuten bis zu deinem Tagesziel."));
        assertThat(ReminderMessages.of(Reminder.DAILY_REMINDER, 0, new DailyGoal(9, 10)).body())
                .isEqualTo("Nur noch 1 Minute bis zu deinem Tagesziel.");
    }

    @Test
    void theRescueSaysTheStreakIsAtRisk() {
        assertThat(ReminderMessages.of(Reminder.STREAK_AT_RISK, 12, NOTHING_YET))
                .isEqualTo(new ReminderMessage("Dein 12-Tage-Streak ist in Gefahr! 🔥",
                        "Mit 10 Minuten Gheg rettest du ihn noch heute."));
        assertThat(ReminderMessages.of(Reminder.STREAK_AT_RISK, 1, new DailyGoal(7, 10)))
                .isEqualTo(new ReminderMessage("Dein Streak ist in Gefahr! 🔥",
                        "Nur noch 3 Minuten bis zu deinem Tagesziel, dann ist er gerettet."));
    }

    @ParameterizedTest
    @EnumSource(value = Reminder.class, names = {"DAILY_REMINDER", "STREAK_AT_RISK"})
    void useSwissOrthography(Reminder reminder) {
        ReminderMessage message = ReminderMessages.of(reminder, 3, new DailyGoal(2, 15));

        assertThat(message.title() + message.body()).doesNotContain("ß");
        assertThat(message.title().length() + message.body().length()).isLessThan(120);
    }

    @Test
    void thereIsNoMessageOnceTheGoalIsMetOrWithoutReminder() {
        assertThatThrownBy(() -> ReminderMessages.of(Reminder.DAILY_REMINDER, 3, new DailyGoal(10, 10)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ReminderMessages.of(Reminder.NONE, 3, NOTHING_YET))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ReminderMessages.of(Reminder.STREAK_AT_RISK, 0, NOTHING_YET))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
