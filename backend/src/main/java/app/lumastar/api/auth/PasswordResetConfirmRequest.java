package app.lumastar.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The token parameter of the link in the mail")
        @NotNull @Size(max = 200) String token,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "At least 8 characters")
        @NotNull @Size(min = AccountConstraints.PASSWORD_MIN, max = AccountConstraints.PASSWORD_MAX) String newPassword) {

    @Override
    public String toString() {
        return "PasswordResetConfirmRequest[token=***, newPassword=***]";
    }
}
