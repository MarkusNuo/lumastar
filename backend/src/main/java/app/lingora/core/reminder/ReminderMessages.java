package app.lingora.core.reminder;

import app.lingora.core.progress.DailyGoal;

/** The German texts of the reminder notifications (Swiss orthography): short, friendly, about today's goal. */
public final class ReminderMessages {

    public static final ReminderMessage TEST =
            new ReminderMessage("Erinnerungen sind bereit 🔔", "So erinnert dich Lingora an dein Tagesziel.");
    public static final String PRACTISE_ACTION = "Jetzt üben";
    /** The label of the snooze action, which snoozes for {@link ReminderPolicy#SNOOZE}. */
    public static final String SNOOZE_ACTION = "In 1 Stunde";

    private ReminderMessages() {
    }

    /**
     * @param streakDays the current streak
     * @param goal       today's progress; the goal is not met yet, else no reminder is sent
     */
    public static ReminderMessage of(Reminder reminder, int streakDays, DailyGoal goal) {
        if (goal.met()) {
            throw new IllegalArgumentException("no reminder once the daily goal is met");
        }
        return switch (reminder) {
            case DAILY_REMINDER -> daily(streakDays, goal);
            case STREAK_AT_RISK -> rescue(streakDays, goal);
            case NONE -> throw new IllegalArgumentException("NONE has no message");
        };
    }

    private static ReminderMessage daily(int streakDays, DailyGoal goal) {
        String title = streakDays > 0 ? "Zeit für Gheg! 🔥" : "Zeit für Gheg!";
        if (goal.minutes() > 0) {
            return new ReminderMessage(title, "Nur noch %s bis zu deinem Tagesziel.".formatted(minutesLeft(goal)));
        }
        if (streakDays > 1) {
            return new ReminderMessage(title, "Dein %d-Tage-Streak wartet auf dich.".formatted(streakDays));
        }
        if (streakDays == 1) {
            return new ReminderMessage(title, "Dein Streak wartet auf dich.");
        }
        return new ReminderMessage(title, "%s reichen für dein Tagesziel.".formatted(minutes(goal.goalMinutes())));
    }

    private static ReminderMessage rescue(int streakDays, DailyGoal goal) {
        if (streakDays <= 0) {
            throw new IllegalArgumentException("only a running streak can be at risk");
        }
        String title = streakDays > 1
                ? "Dein %d-Tage-Streak ist in Gefahr! 🔥".formatted(streakDays)
                : "Dein Streak ist in Gefahr! 🔥";
        String body = goal.minutes() > 0
                ? "Nur noch %s bis zu deinem Tagesziel, dann ist er gerettet.".formatted(minutesLeft(goal))
                : "Mit %s Gheg rettest du ihn noch heute.".formatted(minutes(goal.goalMinutes()));
        return new ReminderMessage(title, body);
    }

    private static String minutesLeft(DailyGoal goal) {
        return minutes(goal.goalMinutes() - goal.minutes());
    }

    private static String minutes(int minutes) {
        return minutes == 1 ? "1 Minute" : minutes + " Minuten";
    }
}
