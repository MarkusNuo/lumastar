package app.lumastar.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * In-memory rate limits of the account endpoints and the test notification (one instance, see
 * {@link ThrottleProperties}): at most the configured number of requests per key within any {@link #WINDOW}. A rejected
 * request does not count.
 */
@Component
public class RequestThrottle {

    static final Duration WINDOW = Duration.ofHours(1);
    private static final int MAX_TRACKED_KEYS = 10_000;

    /** What is limited, and by which key. */
    public enum Action {
        /** Registrations per client address. */
        REGISTRATION,
        /** Password reset requests per client address. */
        PASSWORD_RESET,
        /** Password reset requests per e-mail address, against flooding one mailbox from many addresses. */
        PASSWORD_RESET_FOR_EMAIL,
        /** Verification and e-mail change mails per account. */
        ACCOUNT_MAIL,
        /** Test notifications per account. */
        PUSH_TEST
    }

    private final Clock clock;
    private final Map<Action, Integer> limits = new EnumMap<>(Action.class);
    private final Map<String, Deque<Instant>> requests = new HashMap<>();

    RequestThrottle(ThrottleProperties properties, Clock clock) {
        this.clock = clock;
        limits.put(Action.REGISTRATION, properties.registrationsPerHour());
        limits.put(Action.PASSWORD_RESET, properties.passwordResetsPerHour());
        limits.put(Action.PASSWORD_RESET_FOR_EMAIL, properties.passwordResetsPerEmailPerHour());
        limits.put(Action.ACCOUNT_MAIL, properties.accountMailsPerHour());
        limits.put(Action.PUSH_TEST, properties.pushTestsPerHour());
    }

    /**
     * Counts one request.
     *
     * @throws ThrottledException if the limit of the key is reached; it says when the oldest counted request expires
     */
    public synchronized void admit(Action action, String key) {
        Instant now = clock.instant();
        if (requests.size() >= MAX_TRACKED_KEYS) {
            requests.values().removeIf(times -> times.isEmpty() || isExpired(times.peekLast(), now));
        }
        Deque<Instant> times = requests.computeIfAbsent(action + ":" + key.toLowerCase(Locale.ROOT), ignored -> new ArrayDeque<>());
        while (!times.isEmpty() && isExpired(times.peekFirst(), now)) {
            times.removeFirst();
        }
        if (times.size() >= limits.get(action)) {
            Instant oldest = times.isEmpty() ? now : times.peekFirst();
            throw ThrottledException.requests(Duration.between(now, oldest.plus(WINDOW)));
        }
        times.addLast(now);
    }

    private static boolean isExpired(Instant request, Instant now) {
        return !request.plus(WINDOW).isAfter(now);
    }
}
