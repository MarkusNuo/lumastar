package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EmailChangeRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "erza@example.com")
        @NotBlank @Size(max = AccountConstraints.EMAIL_MAX) @Email(regexp = AccountConstraints.EMAIL_PATTERN) String newEmail,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The current password")
        @NotNull @Size(min = 1, max = AccountConstraints.PASSWORD_MAX) String password) {

    @Override
    public String toString() {
        return "EmailChangeRequest[password=***]";
    }
}
