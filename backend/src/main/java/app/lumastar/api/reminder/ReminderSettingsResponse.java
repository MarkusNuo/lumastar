package app.lumastar.api.reminder;

import app.lumastar.core.reminder.ReminderSettings;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The learner's reminders; times are HH:mm in the learner's time zone (settings)")
public record ReminderSettingsResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Off until the learner switches them on")
        boolean enabled,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "19:00", pattern = ReminderTimes.PATTERN)
        String time,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean rescueEnabled,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "21:30", pattern = ReminderTimes.PATTERN)
        String rescueTime) {

    static ReminderSettingsResponse of(ReminderSettings settings) {
        return new ReminderSettingsResponse(settings.enabled(), ReminderTimes.format(settings.time()),
                settings.rescueEnabled(), ReminderTimes.format(settings.rescueTime()));
    }
}
