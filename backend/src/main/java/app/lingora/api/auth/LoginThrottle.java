package app.lingora.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

/**
 * In-memory brute-force protection for every password check: sign-in and the confirmation of account changes. Every
 * attempt is counted as a failure when it is admitted, before the password is checked, so that parallel requests
 * cannot slip past the limit; a successful check clears the failures of the client. Attempts are keyed by the e-mail
 * address as entered, never by the account, so that unknown and known addresses are throttled alike and no answer
 * reveals an account. Three counts apply:
 * <ul>
 *   <li>per client: after {@value #FREE_ATTEMPTS} consecutive failures, whatever the address, the client is locked out;</li>
 *   <li>per client and address: the same backoff, which a success with another account cannot reset;</li>
 *   <li>per address, across all clients: at most {@value #ATTEMPTS_PER_EMAIL} attempts within {@link #EMAIL_WINDOW},
 *       against attackers that rotate client addresses. The cap is high and its window short, so that nobody can
 *       lock a learner out for long.</li>
 * </ul>
 * A lock lasts {@link #FIRST_LOCK} and doubles with every further failure up to {@link #MAX_LOCK}. Each count keeps at
 * most {@value #MAX_TRACKED_KEYS} keys and forgets the least recently used one beyond that.
 */
@Component
class LoginThrottle {

    static final int FREE_ATTEMPTS = 5;
    static final int ATTEMPTS_PER_EMAIL = 50;
    static final Duration EMAIL_WINDOW = Duration.ofMinutes(10);
    static final Duration FIRST_LOCK = Duration.ofMinutes(1);
    static final Duration MAX_LOCK = Duration.ofMinutes(15);
    static final Duration FORGET_AFTER = Duration.ofHours(1);
    static final int MAX_TRACKED_KEYS = 10_000;

    private final Clock clock;
    private final Map<String, Failures> failuresByClient = new BoundedMap<>();
    private final Map<ClientAndEmail, Failures> failuresByClientAndEmail = new BoundedMap<>();
    private final Map<String, Window> attemptsByEmail = new BoundedMap<>();

    private record ClientAndEmail(String client, String email) {
    }

    private record Failures(int count, Instant lastFailure, Instant lockedUntil) {

        static Failures after(Failures previous, Instant now) {
            int count = previous == null || previous.isStale(now) ? 1 : previous.count() + 1;
            return new Failures(count, now, count < FREE_ATTEMPTS ? null : now.plus(lockDuration(count - FREE_ATTEMPTS)));
        }

        static Instant lockAt(Failures failures, Instant now) {
            return failures != null && failures.lockedUntil() != null && now.isBefore(failures.lockedUntil())
                    ? failures.lockedUntil() : null;
        }

        boolean isStale(Instant now) {
            return lastFailure.plus(FORGET_AFTER).isBefore(now);
        }
    }

    /** The attempts on one address within a fixed window that opens with the first of them. */
    private record Window(Instant start, int attempts) {

        static Window after(Window previous, Instant now) {
            return previous == null || previous.hasEndedAt(now) ? new Window(now, 1)
                    : new Window(previous.start(), previous.attempts() + 1);
        }

        static Instant lockAt(Window window, Instant now) {
            return window != null && !window.hasEndedAt(now) && window.attempts() >= ATTEMPTS_PER_EMAIL ? window.end() : null;
        }

        Instant end() {
            return start.plus(EMAIL_WINDOW);
        }

        boolean hasEndedAt(Instant now) {
            return !now.isBefore(end());
        }
    }

    /** Forgets the least recently used key beyond {@link #MAX_TRACKED_KEYS}, so that a flood of keys cannot fill the memory. */
    private static final class BoundedMap<K, V> extends LinkedHashMap<K, V> {

        BoundedMap() {
            super(16, 0.75f, true);
        }

        @Override
        protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
            return size() > MAX_TRACKED_KEYS;
        }
    }

    LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    /**
     * Admits one attempt and counts it as failed until {@link #recordSuccess} says otherwise.
     *
     * @param email the address signed in with as entered; {@code null} or blank for the account from before M8
     * @throws ThrottledException {@code login_throttled} if the client, the client on this address or the address is
     *                            locked out
     */
    synchronized void admit(String client, String email) {
        Instant now = clock.instant();
        ClientAndEmail pair = new ClientAndEmail(client, normalised(email));
        Failures clientFailures = failuresByClient.get(client);
        Failures pairFailures = failuresByClientAndEmail.get(pair);
        Window emailAttempts = attemptsByEmail.get(pair.email());
        Optional<Instant> lockedUntil = Stream.of(Failures.lockAt(clientFailures, now), Failures.lockAt(pairFailures, now),
                        Window.lockAt(emailAttempts, now))
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder());
        if (lockedUntil.isPresent()) {
            throw ThrottledException.login(Duration.between(now, lockedUntil.get()));
        }
        failuresByClient.put(client, Failures.after(clientFailures, now));
        failuresByClientAndEmail.put(pair, Failures.after(pairFailures, now));
        attemptsByEmail.put(pair.email(), Window.after(emailAttempts, now));
    }

    /** The attempt was right: the client starts afresh, but its attempts still count against the address's cap. */
    synchronized void recordSuccess(String client, String email) {
        failuresByClient.remove(client);
        failuresByClientAndEmail.remove(new ClientAndEmail(client, normalised(email)));
    }

    /** A new password set by a reset link makes the earlier guesses on the address pointless. */
    synchronized void forget(String email) {
        String address = normalised(email);
        attemptsByEmail.remove(address);
        failuresByClientAndEmail.keySet().removeIf(pair -> pair.email().equals(address));
    }

    private static String normalised(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }

    /** {@code beyondFree} failures after the free attempts: 0 → 1 min, 1 → 2 min, … up to the maximum. */
    private static Duration lockDuration(int beyondFree) {
        Duration lock = FIRST_LOCK.multipliedBy(1L << Math.min(beyondFree, 4));
        return lock.compareTo(MAX_LOCK) > 0 ? MAX_LOCK : lock;
    }
}
