package app.lumastar.api.reminder;

import app.lumastar.core.reminder.ReminderSettings;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.LocalTime;

@Schema(description = "All reminder settings at once; times are HH:mm in the learner's time zone (settings)")
public record ReminderSettingsRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Reminders on this account's devices")
        @NotNull Boolean enabled,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "19:00", pattern = ReminderTimes.PATTERN,
                description = "Daily reminder, unless the daily goal is met by then")
        @NotNull @Pattern(regexp = ReminderTimes.PATTERN, message = "must be a time HH:mm") String time,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Streak rescue in the evening")
        @NotNull Boolean rescueEnabled,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "21:30", pattern = ReminderTimes.PATTERN,
                description = "Streak rescue, later than time; sent only while missing today would end the streak")
        @NotNull @Pattern(regexp = ReminderTimes.PATTERN, message = "must be a time HH:mm") String rescueTime) {

    @JsonIgnore
    @AssertTrue(message = "must be later than time")
    public boolean isRescueTimeAfterTime() {
        if (rescueEnabled == null || !rescueEnabled || !ReminderTimes.isValid(time) || !ReminderTimes.isValid(rescueTime)) {
            return true;
        }
        return LocalTime.parse(rescueTime).isAfter(LocalTime.parse(time));
    }

    ReminderSettings toSettings() {
        return new ReminderSettings(enabled, LocalTime.parse(time), rescueEnabled, LocalTime.parse(rescueTime));
    }
}
