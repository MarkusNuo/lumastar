package app.lingora;

import app.lingora.push.PushNotification;
import app.lingora.push.PushOutcome;
import app.lingora.push.PushSender;
import app.lingora.push.PushSubscription;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Records push messages instead of sending them. An endpoint answers {@link PushOutcome#DELIVERED} unless a test sets
 * another outcome for it.
 */
public final class RecordingPushSender implements PushSender {

    /** A push message as it would have been sent. */
    public record SentPush(String endpoint, PushNotification notification, Duration timeToLive) {
    }

    private final List<SentPush> sent = new ArrayList<>();
    private final Map<String, PushOutcome> outcomes = new ConcurrentHashMap<>();

    @Override
    public synchronized PushOutcome send(PushSubscription subscription, PushNotification notification, Duration timeToLive) {
        sent.add(new SentPush(subscription.endpoint(), notification, timeToLive));
        return outcomes.getOrDefault(subscription.endpoint(), PushOutcome.DELIVERED);
    }

    public void answer(String endpoint, PushOutcome outcome) {
        outcomes.put(endpoint, outcome);
    }

    public synchronized List<SentPush> sent() {
        return List.copyOf(sent);
    }

    public synchronized void clear() {
        sent.clear();
        outcomes.clear();
    }
}
