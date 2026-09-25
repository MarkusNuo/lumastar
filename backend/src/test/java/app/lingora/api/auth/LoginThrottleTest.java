package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class LoginThrottleTest {

    private static final String CLIENT = "203.0.113.7";

    private final MutableClock clock = new MutableClock(Instant.parse("2026-09-25T10:00:00Z"));
    private final LoginThrottle throttle = new LoginThrottle(clock);

    @Test
    void allowsTheFreeAttempts() {
        failTimes(LoginThrottle.FREE_ATTEMPTS - 1);

        assertThatNoException().isThrownBy(() -> throttle.checkAllowed(CLIENT));
    }

    @Test
    void locksTheClientAfterTheFreeAttempts() {
        failTimes(LoginThrottle.FREE_ATTEMPTS);

        assertThatThrownBy(() -> throttle.checkAllowed(CLIENT))
                .isInstanceOfSatisfying(LoginThrottledException.class, exception ->
                        assertThat(exception.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("60"));
    }

    @Test
    void unlocksWhenTheLockExpires() {
        failTimes(LoginThrottle.FREE_ATTEMPTS);
        clock.advance(LoginThrottle.FIRST_LOCK);

        assertThatNoException().isThrownBy(() -> throttle.checkAllowed(CLIENT));
    }

    @Test
    void doublesTheLockWithEveryFurtherFailureUpToTheMaximum() {
        failTimes(LoginThrottle.FREE_ATTEMPTS + 1);
        assertRetryAfter(Duration.ofMinutes(2));

        failTimes(10);
        assertRetryAfter(LoginThrottle.MAX_LOCK);
    }

    @Test
    void successResetsTheFailures() {
        failTimes(LoginThrottle.FREE_ATTEMPTS - 1);
        throttle.recordSuccess(CLIENT);
        failTimes(LoginThrottle.FREE_ATTEMPTS - 1);

        assertThatNoException().isThrownBy(() -> throttle.checkAllowed(CLIENT));
    }

    @Test
    void forgetsOldFailures() {
        failTimes(LoginThrottle.FREE_ATTEMPTS - 1);
        clock.advance(LoginThrottle.FORGET_AFTER.plusSeconds(1));
        throttle.recordFailure(CLIENT);

        assertThatNoException().isThrownBy(() -> throttle.checkAllowed(CLIENT));
    }

    @Test
    void tracksClientsSeparately() {
        failTimes(LoginThrottle.FREE_ATTEMPTS);

        assertThatNoException().isThrownBy(() -> throttle.checkAllowed("198.51.100.1"));
    }

    private void failTimes(int times) {
        for (int i = 0; i < times; i++) {
            throttle.recordFailure(CLIENT);
        }
    }

    private void assertRetryAfter(Duration expected) {
        assertThatThrownBy(() -> throttle.checkAllowed(CLIENT))
                .isInstanceOfSatisfying(LoginThrottledException.class, exception ->
                        assertThat(exception.getHeaders().getFirst(HttpHeaders.RETRY_AFTER))
                                .isEqualTo(Long.toString(expected.toSeconds())));
    }
}
