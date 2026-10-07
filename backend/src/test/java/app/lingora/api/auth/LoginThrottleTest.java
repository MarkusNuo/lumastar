package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class LoginThrottleTest {

    private static final String CLIENT = "203.0.113.7";
    private static final String EMAIL = "erza@example.com";

    private final MutableClock clock = new MutableClock(Instant.parse("2026-09-25T10:00:00Z"));
    private final LoginThrottle throttle = new LoginThrottle(clock);

    @Nested
    class PerClient {

        @Test
        void admitsTheFreeAttempts() {
            assertThatNoException().isThrownBy(() -> failTimes(LoginThrottle.FREE_ATTEMPTS));
        }

        @Test
        void locksTheClientAfterTheFreeAttemptsWhateverTheAddress() {
            for (int i = 0; i < LoginThrottle.FREE_ATTEMPTS; i++) {
                throttle.admit(CLIENT, "victim-%d@example.com".formatted(i));
            }

            assertThat(retryAfter(CLIENT, "another@example.com")).isEqualTo(LoginThrottle.FIRST_LOCK);
        }

        @Test
        void doesNotCountAttemptsRejectedDuringTheLock() {
            failTimes(LoginThrottle.FREE_ATTEMPTS);
            for (int i = 0; i < 10; i++) {
                assertThatThrownBy(() -> throttle.admit(CLIENT, EMAIL)).isInstanceOf(ThrottledException.class);
            }
            clock.advance(LoginThrottle.FIRST_LOCK);

            failTimes(1);

            assertThat(retryAfter(CLIENT, EMAIL)).isEqualTo(Duration.ofMinutes(2));
        }

        @Test
        void doublesTheLockWithEveryFurtherFailureUpToTheMaximum() {
            failTimes(LoginThrottle.FREE_ATTEMPTS);
            List<Duration> locks = new ArrayList<>();
            for (int i = 0; i < 6; i++) {
                Duration lock = retryAfter(CLIENT, EMAIL);
                locks.add(lock);
                clock.advance(lock);
                failTimes(1);
            }

            assertThat(locks).extracting(Duration::toMinutes).containsExactly(1L, 2L, 4L, 8L, 15L, 15L);
        }

        @Test
        void successResetsTheFailures() {
            failTimes(LoginThrottle.FREE_ATTEMPTS - 1);
            throttle.recordSuccess(CLIENT, EMAIL);

            assertThatNoException().isThrownBy(() -> failTimes(LoginThrottle.FREE_ATTEMPTS));
        }

        @Test
        void forgetsOldFailures() {
            failTimes(LoginThrottle.FREE_ATTEMPTS - 1);
            clock.advance(LoginThrottle.FORGET_AFTER.plusSeconds(1));

            assertThatNoException().isThrownBy(() -> failTimes(LoginThrottle.FREE_ATTEMPTS));
        }

        @Test
        void tracksClientsSeparately() {
            failTimes(LoginThrottle.FREE_ATTEMPTS);

            assertThatNoException().isThrownBy(() -> throttle.admit("198.51.100.1", EMAIL));
        }
    }

    @Nested
    class PerClientAndAddress {

        @Test
        void aSuccessWithAnotherAccountDoesNotResetTheFailuresOnTheAddress() {
            for (int round = 0; round < LoginThrottle.FREE_ATTEMPTS; round++) {
                throttle.admit(CLIENT, EMAIL);
                throttle.admit(CLIENT, "attacker@example.com");
                throttle.recordSuccess(CLIENT, "attacker@example.com");
            }

            assertThat(retryAfter(CLIENT, EMAIL)).isEqualTo(LoginThrottle.FIRST_LOCK);
            assertThatNoException().isThrownBy(() -> throttle.admit(CLIENT, "attacker@example.com"));
        }

        @Test
        void aSuccessOnTheAddressResetsItsFailures() {
            failTimes(LoginThrottle.FREE_ATTEMPTS - 1);
            throttle.recordSuccess(CLIENT, EMAIL.toUpperCase());

            assertThatNoException().isThrownBy(() -> failTimes(LoginThrottle.FREE_ATTEMPTS));
        }
    }

    @Nested
    class PerAddress {

        @Test
        void capsTheAttemptsOnAnAddressFromRotatingClientsWithinTheWindow() {
            clock.advance(Duration.ofMinutes(3));
            Instant windowStart = clock.instant();
            attemptsFromRotatingClients(EMAIL, LoginThrottle.ATTEMPTS_PER_EMAIL);
            clock.advance(Duration.ofMinutes(4));

            assertThat(retryAfter("192.0.2.1", EMAIL)).isEqualTo(Duration.between(clock.instant(),
                    windowStart.plus(LoginThrottle.EMAIL_WINDOW)));
            assertThatNoException().isThrownBy(() -> throttle.admit("192.0.2.1", "arta@example.com"));
        }

        @Test
        void throttlesAnUnknownAddressExactlyLikeAKnownOne() {
            attemptsFromRotatingClients("nobody@example.com", LoginThrottle.ATTEMPTS_PER_EMAIL);
            attemptsFromRotatingClients(EMAIL, LoginThrottle.ATTEMPTS_PER_EMAIL);

            assertThat(retryAfter("192.0.2.1", "nobody@example.com")).isEqualTo(retryAfter("192.0.2.2", EMAIL))
                    .isEqualTo(LoginThrottle.EMAIL_WINDOW);
        }

        @Test
        void countsAnAddressRegardlessOfCaseAndSurroundingSpaces() {
            attemptsFromRotatingClients(" Erza@Example.COM ", LoginThrottle.ATTEMPTS_PER_EMAIL);

            assertThatThrownBy(() -> throttle.admit("192.0.2.1", EMAIL)).isInstanceOf(ThrottledException.class);
        }

        @Test
        void admitsTheAddressAgainOnceTheShortWindowHasEnded() {
            attemptsFromRotatingClients(EMAIL, LoginThrottle.ATTEMPTS_PER_EMAIL);
            clock.advance(LoginThrottle.EMAIL_WINDOW);

            assertThatNoException().isThrownBy(() -> throttle.admit("192.0.2.1", EMAIL));
        }

        @Test
        void countsTheAccountFromBeforeM8WithoutAddressAsOneKey() {
            attemptsFromRotatingClients(null, LoginThrottle.ATTEMPTS_PER_EMAIL);

            assertThatThrownBy(() -> throttle.admit("192.0.2.1", " ")).isInstanceOf(ThrottledException.class);
        }

        @Test
        void aPasswordResetForgetsTheAttemptsOnTheAddress() {
            failTimes(LoginThrottle.FREE_ATTEMPTS);
            attemptsFromRotatingClients(EMAIL, LoginThrottle.ATTEMPTS_PER_EMAIL - LoginThrottle.FREE_ATTEMPTS);
            throttle.recordSuccess(CLIENT, "attacker@example.com");

            throttle.forget(EMAIL.toUpperCase());

            assertThatNoException().isThrownBy(() -> throttle.admit("192.0.2.1", EMAIL));
            assertThatNoException().isThrownBy(() -> throttle.admit(CLIENT, EMAIL));
        }
    }

    @Test
    void tracksABoundedNumberOfKeysAndForgetsTheLeastRecentlyUsed() {
        failTimes(LoginThrottle.FREE_ATTEMPTS);
        for (int i = 0; i < LoginThrottle.MAX_TRACKED_KEYS; i++) {
            throttle.admit("client-" + i, "someone-%d@example.com".formatted(i));
        }

        assertThatNoException().isThrownBy(() -> throttle.admit(CLIENT, EMAIL));
    }

    @Test
    void admitsNoMoreThanTheFreeAttemptsOfParallelRequests() throws Exception {
        int requests = 50;
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> admitted = new ArrayList<>();
        try (ExecutorService pool = Executors.newFixedThreadPool(16)) {
            for (int i = 0; i < requests; i++) {
                admitted.add(pool.submit(() -> {
                    start.await();
                    try {
                        throttle.admit(CLIENT, EMAIL);
                        return true;
                    } catch (ThrottledException e) {
                        return false;
                    }
                }));
            }
            start.countDown();
            int count = 0;
            for (Future<Boolean> result : admitted) {
                count += result.get() ? 1 : 0;
            }

            assertThat(count).isEqualTo(LoginThrottle.FREE_ATTEMPTS);
        }
    }

    private void failTimes(int times) {
        for (int i = 0; i < times; i++) {
            throttle.admit(CLIENT, EMAIL);
        }
    }

    private void attemptsFromRotatingClients(String email, int attempts) {
        for (int client = 0; client < attempts; client++) {
            throttle.admit("198.51.100." + client, email);
        }
    }

    private Duration retryAfter(String client, String email) {
        try {
            throttle.admit(client, email);
        } catch (ThrottledException e) {
            assertThat(e.getBody().getProperties()).containsEntry("code", "login_throttled");
            return Duration.ofSeconds(Long.parseLong(e.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)));
        }
        throw new AssertionError(client + " on " + email + " is not locked out");
    }
}
