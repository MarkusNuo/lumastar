package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "erza@example.com")
        @NotBlank @Size(max = AccountConstraints.EMAIL_MAX) @Email(regexp = AccountConstraints.EMAIL_PATTERN) String email) {
}
