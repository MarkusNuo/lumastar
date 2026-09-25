package app.lingora.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * In-memory brute-force protection for the login, per client address. After {@value #FREE_ATTEMPTS} consecutive
 * failures the client is locked out; the lock doubles with every further failure up to {@link #MAX_LOCK}.
 */
@Component
class LoginThrottle {

    static final int FREE_ATTEMPTS = 5;
    static final Duration FIRST_LOCK = Duration.ofMinutes(1);
    static final Duration MAX_LOCK = Duration.ofMinutes(15);
    static final Duration FORGET_AFTER = Duration.ofHours(1);
    private static final int MAX_TRACKED_CLIENTS = 1_000;

    private final Clock clock;
    private final Map<String, Failures> failuresByClient = new ConcurrentHashMap<>();

    private record Failures(int count, Instant lastFailure, Instant lockedUntil) {

        boolean isStale(Instant now) {
            return lastFailure.plus(FORGET_AFTER).isBefore(now);
        }
    }

    LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    void checkAllowed(String client) {
        Failures failures = failuresByClient.get(client);
        Instant now = clock.instant();
        if (failures != null && failures.lockedUntil() != null && now.isBefore(failures.lockedUntil())) {
            throw new LoginThrottledException(Duration.between(now, failures.lockedUntil()));
        }
    }

    void recordFailure(String client) {
        Instant now = clock.instant();
        if (failuresByClient.size() >= MAX_TRACKED_CLIENTS) {
            failuresByClient.values().removeIf(failures -> failures.isStale(now));
        }
        failuresByClient.compute(client, (key, previous) -> {
            int count = previous == null || previous.isStale(now) ? 1 : previous.count() + 1;
            Instant lockedUntil = count < FREE_ATTEMPTS ? null : now.plus(lockDuration(count));
            return new Failures(count, now, lockedUntil);
        });
    }

    void recordSuccess(String client) {
        failuresByClient.remove(client);
    }

    private static Duration lockDuration(int failures) {
        int doublings = Math.min(failures - FREE_ATTEMPTS, 4);
        Duration lock = FIRST_LOCK.multipliedBy(1L << doublings);
        return lock.compareTo(MAX_LOCK) > 0 ? MAX_LOCK : lock;
    }
}
