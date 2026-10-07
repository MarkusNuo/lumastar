package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record VerifyEmailRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The token parameter of the link in the mail")
        @NotNull @Size(max = 200) String token) {

    @Override
    public String toString() {
        return "VerifyEmailRequest[token=***]";
    }
}
