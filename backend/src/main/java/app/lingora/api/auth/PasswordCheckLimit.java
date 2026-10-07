package app.lingora.api.auth;

import java.time.Duration;
import java.util.concurrent.Semaphore;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

/**
 * Every Argon2id hash or check allocates 19 MiB. At most {@value #MAX_CONCURRENT_CHECKS} run at the same time; a
 * request beyond that is answered with 429 at once instead of queueing, so that a flood of sign-ins or registrations
 * cannot exhaust the memory.
 */
@Component
class PasswordCheckLimit {

    static final int MAX_CONCURRENT_CHECKS = 4;
    static final Duration RETRY_AFTER = Duration.ofSeconds(1);

    private final Semaphore permits = new Semaphore(MAX_CONCURRENT_CHECKS);

    <T> T run(Supplier<T> hashing) {
        if (!permits.tryAcquire()) {
            throw ThrottledException.login(RETRY_AFTER);
        }
        try {
            return hashing.get();
        } finally {
            permits.release();
        }
    }
}
