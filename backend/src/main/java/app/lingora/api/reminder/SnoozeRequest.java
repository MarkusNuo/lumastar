package app.lingora.api.reminder;

import app.lingora.core.reminder.ReminderPolicy;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Duration;

@Schema(description = "The snoozeToken of a reminder notification")
public record SnoozeRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotBlank @Size(max = 100) String token,
        @Schema(minimum = "5", maximum = "180", defaultValue = "60", description = "Minutes until the reminder comes "
                + "again; 60 if absent, as the action \"In 1 Stunde\" says") @Min(5) @Max(180) Integer minutes) {

    Duration snooze() {
        return minutes == null ? ReminderPolicy.SNOOZE : Duration.ofMinutes(minutes);
    }
}
