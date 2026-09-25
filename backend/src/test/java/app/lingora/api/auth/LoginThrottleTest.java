package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class LoginThrottleTest {

    private static final String CLIENT = "203.0.113.7";
    private static final UUID ACCOUNT = UUID.fromString("00000000-0000-0000-0000-00000000e405");

    private final MutableClock clock = new MutableClock(Instant.parse("2026-09-25T10:00:00Z"));
    private final LoginThrottle throttle = new LoginThrottle(clock);

    @Test
    void admitsTheFreeAttempts() {
        assertThatNoException().isThrownBy(() -> failTimes(LoginThrottle.FREE_ATTEMPTS));
    }

    @Test
    void locksTheClientAfterTheFreeAttempts() {
        failTimes(LoginThrottle.FREE_ATTEMPTS);

        assertRetryAfter(CLIENT, LoginThrottle.FIRST_LOCK);
    }

    @Test
    void doesNotCountAttemptsRejectedDuringTheLock() {
        failTimes(LoginThrottle.FREE_ATTEMPTS);
        for (int i = 0; i < 10; i++) {
            assertThatThrownBy(() -> throttle.admit(CLIENT, ACCOUNT)).isInstanceOf(LoginThrottledException.class);
        }
        clock.advance(LoginThrottle.FIRST_LOCK);

        failTimes(1);

        assertRetryAfter(CLIENT, Duration.ofMinutes(2));
    }

    @Test
    void doublesTheLockWithEveryFurtherFailureUpToTheMaximum() {
        failTimes(LoginThrottle.FREE_ATTEMPTS);
        List<Duration> locks = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            Duration lock = retryAfter(CLIENT);
            locks.add(lock);
            clock.advance(lock);
            failTimes(1);
        }

        assertThat(locks).extracting(Duration::toMinutes).containsExactly(1L, 2L, 4L, 8L, 15L, 15L);
    }

    @Test
    void successResetsTheFailures() {
        failTimes(LoginThrottle.FREE_ATTEMPTS - 1);
        throttle.recordSuccess(CLIENT, ACCOUNT);

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

        assertThatNoException().isThrownBy(() -> throttle.admit("198.51.100.1", ACCOUNT));
    }

    @Test
    void locksTheAccountAfterManyFailuresFromRotatingAddresses() {
        for (int client = 0; client < LoginThrottle.FREE_ACCOUNT_ATTEMPTS; client++) {
            throttle.admit("198.51.100." + client, ACCOUNT);
        }

        assertRetryAfter("192.0.2.1", LoginThrottle.FIRST_LOCK);
        assertThatNoException().isThrownBy(() -> throttle.admit("192.0.2.1", UUID.randomUUID()));
    }

    @Test
    void countsOnlyTheClientBeforeTheAccountExists() {
        for (int client = 0; client < LoginThrottle.FREE_ACCOUNT_ATTEMPTS; client++) {
            throttle.admit("198.51.100." + client, null);
        }

        assertThatNoException().isThrownBy(() -> throttle.admit("192.0.2.1", ACCOUNT));
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
                        throttle.admit(CLIENT, ACCOUNT);
                        return true;
                    } catch (LoginThrottledException e) {
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
            throttle.admit(CLIENT, ACCOUNT);
        }
    }

    private void assertRetryAfter(String client, Duration expected) {
        assertThat(retryAfter(client)).isEqualTo(expected);
    }

    private Duration retryAfter(String client) {
        try {
            throttle.admit(client, ACCOUNT);
        } catch (LoginThrottledException e) {
            return Duration.ofSeconds(Long.parseLong(e.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)));
        }
        throw new AssertionError("expected " + client + " to be locked out");
    }
}
