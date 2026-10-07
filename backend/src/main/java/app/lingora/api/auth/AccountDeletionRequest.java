package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AccountDeletionRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The current password")
        @NotNull @Size(min = 1, max = AccountConstraints.PASSWORD_MAX) String password) {

    @Override
    public String toString() {
        return "AccountDeletionRequest[password=***]";
    }
}
