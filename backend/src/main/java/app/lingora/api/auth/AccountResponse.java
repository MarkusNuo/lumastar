package app.lingora.api.auth;

import app.lingora.persistence.UserEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

public record AccountResponse(
        @Schema(description = "Sign-in address; absent for an account from before multi-user support until one is added")
        String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean emailVerified,
        @Schema(description = "New address of an e-mail change, until it is confirmed by the link sent to it")
        String pendingEmail,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String displayName,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt) {

    static AccountResponse of(UserEntity account) {
        return new AccountResponse(account.getEmail(), account.isEmailVerified(), account.getPendingEmail(),
                account.getDisplayName(), account.getCreatedAt());
    }
}
