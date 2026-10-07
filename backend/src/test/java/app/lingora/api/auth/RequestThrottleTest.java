package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.MutableClock;
import app.lingora.api.auth.RequestThrottle.Action;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

class RequestThrottleTest {

    private static final String CLIENT = "203.0.113.7";

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-07T10:00:00Z"));
    private final RequestThrottle throttle = new RequestThrottle(new ThrottleProperties(5, 10, 3, 2), clock);

    @Test
    void admitsTheConfiguredNumberOfRequestsPerHour() {
        assertThatNoException().isThrownBy(() -> admitTimes(Action.REGISTRATION, CLIENT, 5));

        assertThatThrownBy(() -> throttle.admit(Action.REGISTRATION, CLIENT))
                .isInstanceOfSatisfying(ThrottledException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(exception.getBody().getProperties()).containsEntry("code", "too_many_requests")
                            .containsEntry("retryAfterSeconds", 3600L);
                    assertThat(exception.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("3600");
                });
    }

    @Test
    void appliesTheLimitOfEachAction() {
        admitTimes(Action.PASSWORD_RESET, CLIENT, 10);
        admitTimes(Action.PASSWORD_RESET_FOR_EMAIL, "erza@example.com", 3);
        admitTimes(Action.ACCOUNT_MAIL, "account", 2);

        assertThatThrownBy(() -> throttle.admit(Action.PASSWORD_RESET, CLIENT)).isInstanceOf(ThrottledException.class);
        assertThatThrownBy(() -> throttle.admit(Action.PASSWORD_RESET_FOR_EMAIL, "erza@example.com"))
                .isInstanceOf(ThrottledException.class);
        assertThatThrownBy(() -> throttle.admit(Action.ACCOUNT_MAIL, "account")).isInstanceOf(ThrottledException.class);
        assertThatNoException().isThrownBy(() -> throttle.admit(Action.REGISTRATION, CLIENT));
    }

    @Test
    void countsEveryKeyOnItsOwnAndIgnoresTheCaseOfAddresses() {
        admitTimes(Action.PASSWORD_RESET_FOR_EMAIL, "Erza@Example.com", 3);

        assertThatThrownBy(() -> throttle.admit(Action.PASSWORD_RESET_FOR_EMAIL, "erza@example.com"))
                .isInstanceOf(ThrottledException.class);
        assertThatNoException().isThrownBy(() -> throttle.admit(Action.PASSWORD_RESET_FOR_EMAIL, "arta@example.com"));
    }

    @Test
    void admitsAgainOnceTheOldestCountedRequestIsAnHourOld() {
        admitTimes(Action.ACCOUNT_MAIL, "account", 1);
        clock.advance(Duration.ofMinutes(40));
        admitTimes(Action.ACCOUNT_MAIL, "account", 1);

        assertThat(retryAfter(Action.ACCOUNT_MAIL, "account")).isEqualTo("1200");
        clock.advance(Duration.ofMinutes(20));
        assertThatNoException().isThrownBy(() -> throttle.admit(Action.ACCOUNT_MAIL, "account"));
        assertThat(retryAfter(Action.ACCOUNT_MAIL, "account")).isEqualTo("2400");
    }

    @Test
    void doesNotCountRejectedRequests() {
        admitTimes(Action.ACCOUNT_MAIL, "account", 2);
        for (int i = 0; i < 5; i++) {
            clock.advance(Duration.ofMinutes(1));
            assertThatThrownBy(() -> throttle.admit(Action.ACCOUNT_MAIL, "account")).isInstanceOf(ThrottledException.class);
        }

        clock.advance(Duration.ofMinutes(55));

        assertThatNoException().isThrownBy(() -> admitTimes(Action.ACCOUNT_MAIL, "account", 2));
    }

    @Test
    void aLimitOfZeroRejectsEveryRequest() {
        RequestThrottle closed = new RequestThrottle(new ThrottleProperties(0, 10, 3, 2), clock);

        assertThatThrownBy(() -> closed.admit(Action.REGISTRATION, CLIENT)).isInstanceOf(ThrottledException.class);
    }

    private void admitTimes(Action action, String key, int times) {
        for (int i = 0; i < times; i++) {
            throttle.admit(action, key);
        }
    }

    private String retryAfter(Action action, String key) {
        try {
            throttle.admit(action, key);
            throw new AssertionError("not throttled");
        } catch (ThrottledException e) {
            return e.getHeaders().getFirst(HttpHeaders.RETRY_AFTER);
        }
    }
}
