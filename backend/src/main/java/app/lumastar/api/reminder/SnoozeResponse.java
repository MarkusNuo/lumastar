package app.lumastar.api.reminder;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "When the snoozed reminder comes again, unless the daily goal is met by then")
public record SnoozeResponse(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant snoozedUntil) {
}
