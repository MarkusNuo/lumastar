package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;

public record AuthStatusResponse(
        @Schema(description = "No account exists yet; the app shows the first-start setup",
                requiredMode = Schema.RequiredMode.REQUIRED) boolean setupRequired,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean authenticated,
        @Schema(description = "Only present when authenticated") String displayName) {
}
