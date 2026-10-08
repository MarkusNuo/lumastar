package app.lingora.push;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Sends push messages on a few threads of its own, in the order they come: a slow or unreachable push service holds
 * up one of them for at most its timeout, while the others go on with the messages of other learners. Messages still
 * waiting when the app stops are dropped.
 */
public final class PushDispatcher implements AutoCloseable {

    private final PushSender sender;
    private final ExecutorService senders;

    PushDispatcher(PushSender sender, int parallelSends) {
        this.sender = sender;
        this.senders = Executors.newFixedThreadPool(parallelSends, Thread.ofPlatform().name("push-sender-", 1).daemon().factory());
    }

    /** Sends one notification to one subscription; completes exceptionally if the sender fails. */
    public CompletableFuture<PushOutcome> dispatch(PushSubscription subscription, PushNotification notification,
                                                   Duration timeToLive) {
        return CompletableFuture.supplyAsync(() -> sender.send(subscription, notification, timeToLive), senders);
    }

    @Override
    public void close() {
        senders.shutdownNow();
    }
}
