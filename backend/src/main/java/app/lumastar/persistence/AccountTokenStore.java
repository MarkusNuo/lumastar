package app.lumastar.persistence;

import app.lumastar.domain.Coded;
import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Table {@code account_tokens}: the unused links of account mails, stored by the hash of their token. */
@Repository
public class AccountTokenStore {

    private final JdbcClient jdbc;

    public AccountTokenStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** A link taken from the store; {@code email} is the address it was sent to. */
    public record StoredToken(UUID userId, AccountTokenPurpose purpose, String email, Instant expiresAt) {

        public boolean isExpiredAt(Instant now) {
            return !now.isBefore(expiresAt);
        }
    }

    /**
     * Stores a new link of the account; it replaces the account's earlier link of the same purpose in one statement, so
     * that concurrent replacements leave exactly one link.
     */
    public void replace(UUID userId, AccountTokenPurpose purpose, String tokenHash, String email, Instant at) {
        jdbc.sql("""
                        INSERT INTO account_tokens (user_id, purpose, token_hash, email, created_at, expires_at)
                        VALUES (:user, :purpose, :hash, :email, :at, :expiresAt)
                        ON CONFLICT (user_id, purpose) DO UPDATE SET token_hash = EXCLUDED.token_hash,
                            email = EXCLUDED.email, created_at = EXCLUDED.created_at, expires_at = EXCLUDED.expires_at""")
                .param("user", userId)
                .param("purpose", purpose.code())
                .param("hash", tokenHash)
                .param("email", email)
                .param("at", SqlTimestamps.of(at))
                .param("expiresAt", SqlTimestamps.of(at.plus(purpose.validity())))
                .update();
    }

    /**
     * Removes the link with this token hash if it has one of the purposes and returns it: a link works only once,
     * also when it is used twice at the same time. Links of other purposes stay.
     */
    public Optional<StoredToken> take(String tokenHash, AccountTokenPurpose... purposes) {
        return jdbc.sql("""
                        DELETE FROM account_tokens WHERE token_hash = :hash AND purpose = ANY (:purposes)
                        RETURNING user_id, purpose, email, expires_at""")
                .param("hash", tokenHash)
                .param("purposes", Arrays.stream(purposes).map(AccountTokenPurpose::code).toArray(String[]::new))
                .query((row, rowNumber) -> new StoredToken(row.getObject("user_id", UUID.class),
                        Coded.fromCode(AccountTokenPurpose.class, row.getString("purpose")), row.getString("email"),
                        SqlTimestamps.instant(row, "expires_at")))
                .optional();
    }

    public void delete(UUID userId, AccountTokenPurpose purpose) {
        jdbc.sql("DELETE FROM account_tokens WHERE user_id = :user AND purpose = :purpose")
                .param("user", userId)
                .param("purpose", purpose.code())
                .update();
    }
}
