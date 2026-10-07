package app.lingora.api.push;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Whether this instance sends web push, and the key to subscribe with")
public record PushConfigResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "false while the server has no VAPID keys; "
                + "reminders cannot be sent then") boolean available,
        @Schema(description = "VAPID public key (URL-safe Base64) for pushManager.subscribe({applicationServerKey}); "
                + "absent if web push is not available. A subscription made with another key must be renewed.")
        String publicKey) {
}
