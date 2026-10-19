package app.lumastar.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Creates an account and signs in.")
public record RegisterRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Sign-in address; unique regardless of case",
                example = "erza@example.com")
        @NotBlank @Size(max = AccountConstraints.EMAIL_MAX) @Email(regexp = AccountConstraints.EMAIL_PATTERN) String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "At least 8 characters")
        @NotNull @Size(min = AccountConstraints.PASSWORD_MIN, max = AccountConstraints.PASSWORD_MAX) String password,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Name shown in the app", example = "Erza")
        @NotBlank @Size(max = AccountConstraints.DISPLAY_NAME_MAX) @Pattern(regexp = AccountConstraints.NO_CONTROL_CHARACTERS)
        String displayName,
        @Schema(description = "Required when the registration mode is invite")
        @Size(max = 200) String inviteCode) {

    @Override
    public String toString() {
        return "RegisterRequest[displayName=" + displayName + ", password=***, inviteCode=***]";
    }
}
