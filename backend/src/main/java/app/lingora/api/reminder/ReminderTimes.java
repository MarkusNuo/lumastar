package app.lingora.api.reminder;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

/** Reminder times in the API: wall-clock times {@code HH:mm}. */
final class ReminderTimes {

    static final String PATTERN = "^([01][0-9]|2[0-3]):[0-5][0-9]$";
    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private ReminderTimes() {
    }

    static boolean isValid(String time) {
        return time != null && time.matches(PATTERN);
    }

    static String format(LocalTime time) {
        return FORMAT.format(time);
    }
}
