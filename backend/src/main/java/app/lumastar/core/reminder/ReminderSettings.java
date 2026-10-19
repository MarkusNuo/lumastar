package app.lumastar.core.reminder;

import java.time.LocalTime;
import java.util.Objects;

/**
 * The learner's reminders, as wall-clock times of the learner's time zone: the daily reminder at {@code time} and, if
 * {@code rescueEnabled}, the streak rescue at the later {@code rescueTime}. Reminders are off until the learner opts in.
 */
public record ReminderSettings(boolean enabled, LocalTime time, boolean rescueEnabled, LocalTime rescueTime) {

    public static final ReminderSettings DEFAULT =
            new ReminderSettings(false, LocalTime.of(19, 0), true, LocalTime.of(21, 30));

    public ReminderSettings {
        Objects.requireNonNull(time, "time");
        Objects.requireNonNull(rescueTime, "rescueTime");
        if (rescueEnabled && !rescueTime.isAfter(time)) {
            throw new IllegalArgumentException("the streak rescue (%s) must come after the daily reminder (%s)"
                    .formatted(rescueTime, time));
        }
    }
}
