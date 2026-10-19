package app.lumastar.push;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class PushDispatcherTest {

    private static final long PATIENCE_SECONDS = 10;
    private static final TestUserAgent BROWSER = TestUserAgent.generate();
    private static final PushSubscription SUBSCRIPTION = new PushSubscription("https://fcm.googleapis.com/fcm/send/phone",
            BROWSER.p256dh(), BROWSER.auth());
    private static final PushNotification NOTIFICATION = PushNotification.of(NotificationKind.TEST, "Titel", "Text",
            PushNotification.HOME, List.of(), null, null);

    @Test
    void sendsAtMostTheConfiguredNumberOfMessagesAtOnce() throws Exception {
        CountDownLatch twoStarted = new CountDownLatch(2);
        CountDownLatch answer = new CountDownLatch(1);
        AtomicInteger running = new AtomicInteger();
        AtomicInteger mostAtOnce = new AtomicInteger();
        PushSender slowPushService = (subscription, notification, timeToLive) -> {
            mostAtOnce.accumulateAndGet(running.incrementAndGet(), Math::max);
            twoStarted.countDown();
            awaitQuietly(answer);
            running.decrementAndGet();
            return PushOutcome.DELIVERED;
        };

        try (PushDispatcher dispatcher = new PushDispatcher(slowPushService, 2)) {
            List<CompletableFuture<PushOutcome>> sends = IntStream.range(0, 3)
                    .mapToObj(send -> dispatcher.dispatch(SUBSCRIPTION, NOTIFICATION, Duration.ofMinutes(10)))
                    .toList();

            assertThat(twoStarted.await(PATIENCE_SECONDS, TimeUnit.SECONDS)).isTrue();
            assertThat(sends.get(2)).as("waits for a free sender").isNotDone();
            answer.countDown();
            CompletableFuture.allOf(sends.toArray(new CompletableFuture<?>[0])).get(PATIENCE_SECONDS, TimeUnit.SECONDS);

            assertThat(sends).allSatisfy(send -> assertThat(send).isCompletedWithValue(PushOutcome.DELIVERED));
            assertThat(mostAtOnce).hasValue(2);
        }
    }

    @Test
    void reportsAFailingSender() {
        PushSender broken = (subscription, notification, timeToLive) -> {
            throw new IllegalStateException("broken");
        };

        try (PushDispatcher dispatcher = new PushDispatcher(broken, 1)) {
            CompletableFuture<PushOutcome> send = dispatcher.dispatch(SUBSCRIPTION, NOTIFICATION, Duration.ofMinutes(10));

            assertThat(send).failsWithin(Duration.ofSeconds(PATIENCE_SECONDS)).withThrowableThat()
                    .withRootCauseInstanceOf(IllegalStateException.class);
        }
    }

    private static void awaitQuietly(CountDownLatch latch) {
        try {
            latch.await(PATIENCE_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
