package app.lumastar.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DisplayNameRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Name shown in the app", example = "Erza")
        @NotBlank @Size(max = AccountConstraints.DISPLAY_NAME_MAX) @Pattern(regexp = AccountConstraints.NO_CONTROL_CHARACTERS)
        String displayName) {
}
