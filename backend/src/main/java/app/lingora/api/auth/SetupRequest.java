package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Creates the only account of this instance.")
public record SetupRequest(
        @Schema(description = "Name shown in the app", example = "Erza")
        @NotBlank @Size(min = 1, max = 40) String displayName,
        @Schema(description = "Protects the instance; at least 8 characters")
        @NotNull @Size(min = 8, max = 128) String password) {

    @Override
    public String toString() {
        return "SetupRequest[displayName=" + displayName + ", password=***]";
    }
}
