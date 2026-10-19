package app.lumastar;

import app.lumastar.push.PushNotification;
import app.lumastar.push.PushOutcome;
import app.lumastar.push.PushSender;
import app.lumastar.push.PushSubscription;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Records push messages instead of sending them. An endpoint answers {@link PushOutcome#DELIVERED} unless a test sets
 * another outcome for it, and answers at once unless a test {@linkplain #hold(String) holds} it like a slow push service.
 */
public final class RecordingPushSender implements PushSender {

    /** Even a held endpoint answers after this time, so that a failed test never blocks the push senders for good. */
    private static final Duration LONGEST_HOLD = Duration.ofSeconds(30);

    /** A push message as it would have been sent. */
    public record SentPush(String endpoint, PushNotification notification, Duration timeToLive) {
    }

    private final List<SentPush> sent = new ArrayList<>();
    private final Map<String, PushOutcome> outcomes = new ConcurrentHashMap<>();
    private final Map<String, CountDownLatch> held = new ConcurrentHashMap<>();

    @Override
    public PushOutcome send(PushSubscription subscription, PushNotification notification, Duration timeToLive) {
        CountDownLatch hold = held.get(subscription.endpoint());
        if (hold != null) {
            awaitRelease(hold);
        }
        synchronized (this) {
            sent.add(new SentPush(subscription.endpoint(), notification, timeToLive));
            notifyAll();
        }
        return outcomes.getOrDefault(subscription.endpoint(), PushOutcome.DELIVERED);
    }

    public void answer(String endpoint, PushOutcome outcome) {
        outcomes.put(endpoint, outcome);
    }

    /** Lets push messages to the endpoint wait until {@link #release(String)}. */
    public void hold(String endpoint) {
        held.put(endpoint, new CountDownLatch(1));
    }

    public void release(String endpoint) {
        CountDownLatch hold = held.remove(endpoint);
        if (hold != null) {
            hold.countDown();
        }
    }

    /** Waits until a push message to the endpoint is recorded; {@code false} if none is within the timeout. */
    public synchronized boolean awaitSent(String endpoint, Duration timeout) throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (sent.stream().noneMatch(push -> push.endpoint().equals(endpoint))) {
            long left = deadline - System.nanoTime();
            if (left <= 0) {
                return false;
            }
            TimeUnit.NANOSECONDS.timedWait(this, left);
        }
        return true;
    }

    public synchronized List<SentPush> sent() {
        return List.copyOf(sent);
    }

    public synchronized void clear() {
        sent.clear();
        outcomes.clear();
        held.keySet().forEach(this::release);
    }

    private static void awaitRelease(CountDownLatch hold) {
        try {
            hold.await(LONGEST_HOLD.toMillis(), TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
