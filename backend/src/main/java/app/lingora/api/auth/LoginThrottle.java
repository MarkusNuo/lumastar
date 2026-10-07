package app.lingora.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * In-memory brute-force protection for every password check: sign-in and the confirmation of account changes. Every
 * attempt is counted as a failure when it is admitted, before the password is checked, so that parallel requests
 * cannot slip past the limit; a successful check clears the count. Failures are counted per client address and per
 * account (against attackers that rotate addresses). After {@value #FREE_ATTEMPTS} consecutive failures of a client,
 * or {@value #FREE_ACCOUNT_ATTEMPTS} of an account, further attempts are locked out; the lock doubles with every
 * further failure up to {@link #MAX_LOCK}.
 */
@Component
class LoginThrottle {

    static final int FREE_ATTEMPTS = 5;
    static final int FREE_ACCOUNT_ATTEMPTS = 20;
    static final Duration FIRST_LOCK = Duration.ofMinutes(1);
    static final Duration MAX_LOCK = Duration.ofMinutes(15);
    static final Duration FORGET_AFTER = Duration.ofHours(1);
    private static final int MAX_TRACKED_CLIENTS = 1_000;

    private final Clock clock;
    private final Map<String, Failures> failuresByClient = new HashMap<>();
    private final Map<UUID, Failures> failuresByAccount = new HashMap<>();

    private record Failures(int count, Instant lastFailure, Instant lockedUntil) {

        static Failures after(Failures previous, Instant now, int freeAttempts) {
            int count = previous == null || previous.isStale(now) ? 1 : previous.count() + 1;
            return new Failures(count, now, count < freeAttempts ? null : now.plus(lockDuration(count - freeAttempts)));
        }

        boolean isLockedAt(Instant now) {
            return lockedUntil != null && now.isBefore(lockedUntil);
        }

        boolean isStale(Instant now) {
            return lastFailure.plus(FORGET_AFTER).isBefore(now);
        }
    }

    LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    /**
     * Admits one sign-in attempt and counts it as failed until {@link #recordSuccess} says otherwise.
     *
     * @param account the account whose password is checked, {@code null} if no account has the given address
     * @throws ThrottledException if the client or the account is locked out
     */
    synchronized void admit(String client, UUID account) {
        Instant now = clock.instant();
        Failures clientFailures = failuresByClient.get(client);
        Failures accountFailures = account == null ? null : failuresByAccount.get(account);
        Instant lockedUntil = latestLock(now, clientFailures, accountFailures);
        if (lockedUntil != null) {
            throw ThrottledException.login(Duration.between(now, lockedUntil));
        }
        if (failuresByClient.size() >= MAX_TRACKED_CLIENTS) {
            failuresByClient.values().removeIf(failures -> failures.isStale(now));
        }
        failuresByClient.put(client, Failures.after(clientFailures, now, FREE_ATTEMPTS));
        if (account != null) {
            failuresByAccount.put(account, Failures.after(accountFailures, now, FREE_ACCOUNT_ATTEMPTS));
        }
    }

    synchronized void recordSuccess(String client, UUID account) {
        failuresByClient.remove(client);
        failuresByAccount.remove(account);
    }

    /** A new password set by a reset link ends the lockout of the account. */
    synchronized void forgetAccount(UUID account) {
        failuresByAccount.remove(account);
    }

    private static Instant latestLock(Instant now, Failures... failures) {
        Instant latest = null;
        for (Failures failure : failures) {
            if (failure != null && failure.isLockedAt(now) && (latest == null || failure.lockedUntil().isAfter(latest))) {
                latest = failure.lockedUntil();
            }
        }
        return latest;
    }

    /** {@code beyondFree} failures after the free attempts: 0 → 1 min, 1 → 2 min, … up to the maximum. */
    private static Duration lockDuration(int beyondFree) {
        Duration lock = FIRST_LOCK.multipliedBy(1L << Math.min(beyondFree, 4));
        return lock.compareTo(MAX_LOCK) > 0 ? MAX_LOCK : lock;
    }
}
