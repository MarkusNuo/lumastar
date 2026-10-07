package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @Schema(description = "Sign-in address. Without it, the account from before multi-user support signs in, as long "
                + "as it has no e-mail address yet (legacyLoginAvailable).", example = "erza@example.com")
        @Size(max = AccountConstraints.EMAIL_MAX) String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull @Size(min = 1, max = AccountConstraints.PASSWORD_MAX) String password) {

    @Override
    public String toString() {
        return "LoginRequest[password=***]";
    }
}
