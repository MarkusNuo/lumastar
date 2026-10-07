package app.lingora.api.auth;

import app.lingora.persistence.UserEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Hashing and checking of passwords (Argon2id), within the {@link PasswordCheckLimit}; every check counts against the
 * {@link LoginThrottle} until it succeeds.
 */
@Component
class Passwords {

    private final PasswordEncoder encoder;
    private final PasswordCheckLimit limit;
    private final LoginThrottle throttle;
    // Checked instead when no account has the address, so that the response time does not reveal which ones exist
    private final String noAccountHash;

    Passwords(PasswordEncoder encoder, PasswordCheckLimit limit, LoginThrottle throttle) {
        this.encoder = encoder;
        this.limit = limit;
        this.throttle = throttle;
        this.noAccountHash = encoder.encode(UUID.randomUUID().toString());
    }

    String hash(String password) {
        return limit.run(() -> encoder.encode(password));
    }

    /** Whether {@code password} is the one of {@code account}; an absent account never matches. */
    boolean matches(Optional<UserEntity> account, String password, String client) {
        UUID accountId = account.map(UserEntity::getId).orElse(null);
        boolean matches = limit.run(() -> {
            throttle.admit(client, accountId);
            return encoder.matches(password, account.map(UserEntity::getPasswordHash).orElse(noAccountHash))
                    && account.isPresent();
        });
        if (matches) {
            throttle.recordSuccess(client, accountId);
        }
        return matches;
    }

    /** Account changes are confirmed with the current password. */
    void requireCurrent(UserEntity account, String password, String client) {
        if (!matches(Optional.of(account), password, client)) {
            throw AccountProblems.invalidPassword();
        }
    }

    void forgetFailures(UserEntity account) {
        throttle.forgetAccount(account.getId());
    }
}
