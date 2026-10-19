package app.lumastar.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

class PasswordCheckLimitTest {

    private final PasswordCheckLimit limit = new PasswordCheckLimit();

    @Test
    void rejectsACheckWhileTheMaximumIsRunningAndAcceptsItAgainAfterwards() throws Exception {
        CountDownLatch running = new CountDownLatch(PasswordCheckLimit.MAX_CONCURRENT_CHECKS);
        CountDownLatch release = new CountDownLatch(1);
        List<Future<Boolean>> slowChecks = new ArrayList<>();
        try (ExecutorService pool = Executors.newFixedThreadPool(PasswordCheckLimit.MAX_CONCURRENT_CHECKS)) {
            for (int i = 0; i < PasswordCheckLimit.MAX_CONCURRENT_CHECKS; i++) {
                slowChecks.add(pool.submit(() -> limit.run(() -> {
                    running.countDown();
                    return awaitQuietly(release);
                })));
            }
            assertThat(running.await(10, TimeUnit.SECONDS)).isTrue();

            assertThatThrownBy(() -> limit.run(() -> true))
                    .isInstanceOfSatisfying(ThrottledException.class, exception -> {
                        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                        assertThat(exception.getBody().getProperties()).containsEntry("code", "too_many_requests");
                        assertThat(exception.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("1");
                    });

            release.countDown();
            for (Future<Boolean> check : slowChecks) {
                assertThat(check.get()).isTrue();
            }
        }
        assertThat(limit.run(() -> false)).isFalse();
    }

    @Test
    void releasesThePermitWhenTheCheckFails() {
        for (int i = 0; i < PasswordCheckLimit.MAX_CONCURRENT_CHECKS + 1; i++) {
            assertThatThrownBy(() -> limit.run(() -> {
                throw new IllegalStateException("hashing failed");
            })).isInstanceOf(IllegalStateException.class);
        }

        assertThat(limit.run(() -> true)).isTrue();
    }

    private static boolean awaitQuietly(CountDownLatch latch) {
        try {
            return latch.await(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
