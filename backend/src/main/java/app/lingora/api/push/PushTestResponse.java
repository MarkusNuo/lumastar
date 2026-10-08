package app.lingora.api.push;

import app.lingora.push.PushNotification;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The test notification and how its delivery went")
public record PushTestResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Devices it was sent to") int devices,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Devices whose push service accepted it")
        int delivered,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Devices removed because their push service no "
                + "longer knows the subscription or too many deliveries in a row failed") int removed,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The payload as sent, the same format as the "
                + "reminders") PushNotification notification) {
}
