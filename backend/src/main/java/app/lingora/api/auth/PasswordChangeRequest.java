package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull @Size(min = 1, max = AccountConstraints.PASSWORD_MAX) String currentPassword,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "At least 8 characters")
        @NotNull @Size(min = AccountConstraints.PASSWORD_MIN, max = AccountConstraints.PASSWORD_MAX) String newPassword) {

    @Override
    public String toString() {
        return "PasswordChangeRequest[currentPassword=***, newPassword=***]";
    }
}
