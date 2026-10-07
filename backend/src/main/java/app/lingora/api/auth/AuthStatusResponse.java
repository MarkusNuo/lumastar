package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;

public record AuthStatusResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean authenticated,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Whether the registration form is offered "
                + "(open), needs an invite code (invite) or is not offered (closed)")
        RegistrationMode registrationMode,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "An account from before multi-user support "
                + "has no e-mail address yet and signs in with its password only")
        boolean legacyLoginAvailable,
        @Schema(description = "Only present when authenticated") String displayName,
        @Schema(description = "Only present when authenticated") Boolean emailVerified) {
}
