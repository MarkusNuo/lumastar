package app.lumastar.api.auth;

import app.lumastar.persistence.AccountTokenPurpose;
import app.lumastar.persistence.AccountTokenStore;
import app.lumastar.persistence.AccountTokenStore.StoredToken;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * The single-use links of account mails: 32 random bytes, URL-safe in the link and stored only as their SHA-256 hash,
 * so that a copy of the database cannot be used to verify addresses or reset passwords.
 */
@Component
class AccountTokens {

    private static final int TOKEN_BYTES = 32;

    private final SecureRandom random = new SecureRandom();
    private final AccountTokenStore store;
    private final Clock clock;

    AccountTokens(AccountTokenStore store, Clock clock) {
        this.store = store;
        this.clock = clock;
    }

    /** A new link for the account and address; it replaces the earlier links of the same purpose. */
    String issue(UUID userId, AccountTokenPurpose purpose, String email) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        store.replace(userId, purpose, hash(token), email, clock.instant());
        return token;
    }

    /**
     * Uses up a link of one of the purposes. Within a transaction that fails afterwards the link stays usable.
     *
     * @throws app.lumastar.api.error.ApiProblemException {@code token_invalid} if there is no such unused link,
     *                                                   {@code token_expired} if it has expired
     */
    StoredToken redeem(String token, AccountTokenPurpose... purposes) {
        StoredToken stored = store.take(hash(token), purposes).orElseThrow(AccountProblems::tokenInvalid);
        if (stored.isExpiredAt(clock.instant())) {
            throw AccountProblems.tokenExpired();
        }
        return stored;
    }

    void revoke(UUID userId, AccountTokenPurpose purpose) {
        store.delete(userId, purpose);
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Every Java platform supports SHA-256", e);
        }
    }
}
