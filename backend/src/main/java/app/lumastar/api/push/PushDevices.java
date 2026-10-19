package app.lumastar.api.push;

import app.lumastar.api.auth.RequestThrottle;
import app.lumastar.api.auth.RequestThrottle.Action;
import app.lumastar.api.error.ApiProblemException;
import app.lumastar.core.reminder.ReminderMessages;
import app.lumastar.persistence.PushSubscriptionStore;
import app.lumastar.persistence.PushSubscriptionStore.StoredSubscription;
import app.lumastar.push.NotificationKind;
import app.lumastar.push.PushDispatcher;
import app.lumastar.push.PushEndpoints;
import app.lumastar.push.PushNotification;
import app.lumastar.push.PushOutcome;
import app.lumastar.push.PushProperties;
import app.lumastar.push.PushSetup;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * The learner's devices for web push and the delivery of notifications to all of them. A learner has at most
 * {@code lumastar.push.max-devices}; a subscription the push service reports as gone is deleted, and so is one whose
 * deliveries failed {@code lumastar.push.max-failures} times in a row.
 */
@Service
public class PushDevices {

    private static final Logger LOG = LoggerFactory.getLogger(PushDevices.class);
    /** A test notification is pointless once the learner has stopped waiting for it. */
    private static final Duration TEST_TIME_TO_LIVE = Duration.ofMinutes(10);

    private final PushSubscriptionStore subscriptions;
    private final PushDispatcher dispatcher;
    private final PushSetup setup;
    private final PushEndpoints endpoints;
    private final PushProperties properties;
    private final RequestThrottle throttle;
    private final Clock clock;

    PushDevices(PushSubscriptionStore subscriptions, PushDispatcher dispatcher, PushSetup setup, PushEndpoints endpoints,
                PushProperties properties, RequestThrottle throttle, Clock clock) {
        this.subscriptions = subscriptions;
        this.dispatcher = dispatcher;
        this.setup = setup;
        this.endpoints = endpoints;
        this.properties = properties;
        this.throttle = throttle;
        this.clock = clock;
    }

    /** How a notification went to the learner's devices. */
    public record Delivery(int devices, int delivered, int removed) {

        static Delivery of(List<DeviceResult> results) {
            return new Delivery(results.size(), count(results, DeviceResult.DELIVERED), count(results, DeviceResult.REMOVED));
        }

        private static int count(List<DeviceResult> results, DeviceResult result) {
            return (int) results.stream().filter(result::equals).count();
        }
    }

    private enum DeviceResult { DELIVERED, FAILED, REMOVED }

    List<StoredSubscription> of(UUID userId) {
        return subscriptions.of(userId);
    }

    StoredSubscription subscribe(UUID userId, PushSubscriptionRequest request) {
        requireAvailable();
        if (!endpoints.isAllowed(request.endpoint().strip())) {
            throw new ApiProblemException(HttpStatus.BAD_REQUEST, "push_service_not_supported",
                    "The endpoint does not belong to a supported push service.");
        }
        StoredSubscription saved = subscriptions.save(userId, request.subscription(), request.deviceLabel(), clock.instant());
        subscriptions.keepMostRecent(userId, properties.maxDevices(), saved.id());
        return saved;
    }

    void unsubscribe(UUID userId, String endpoint) {
        subscriptions.delete(userId, endpoint.strip());
    }

    PushTestResponse sendTest(UUID userId) {
        requireAvailable();
        if (subscriptions.of(userId).isEmpty()) {
            throw new ApiProblemException(HttpStatus.CONFLICT, "no_push_devices", "No device of the account receives push messages.");
        }
        throttle.admit(Action.PUSH_TEST, userId.toString());
        PushNotification notification = PushNotification.of(NotificationKind.TEST, ReminderMessages.TEST.title(),
                ReminderMessages.TEST.body(), PushNotification.HOME, List.of(), null, null);
        Delivery delivery = deliver(userId, notification, TEST_TIME_TO_LIVE).join();
        return new PushTestResponse(delivery.devices(), delivery.delivered(), delivery.removed(), notification);
    }

    /**
     * Sends the notification to every device of the learner at once, through the {@link PushDispatcher}; web push must
     * be {@linkplain PushSetup#available() on}. Completes when every device has answered or timed out.
     */
    public CompletableFuture<Delivery> deliver(UUID userId, PushNotification notification, Duration timeToLive) {
        List<CompletableFuture<DeviceResult>> sends = subscriptions.of(userId).stream()
                .map(device -> dispatcher.dispatch(device.subscription(), notification, timeToLive)
                        .exceptionally(failure -> {
                            LOG.warn("Push message to device {} failed", device.id(), failure);
                            return PushOutcome.FAILED;
                        })
                        .thenApply(outcome -> record(device, outcome)))
                .toList();
        return CompletableFuture.allOf(sends.toArray(new CompletableFuture<?>[0]))
                .thenApply(allDone -> Delivery.of(sends.stream().map(CompletableFuture::join).toList()));
    }

    private DeviceResult record(StoredSubscription device, PushOutcome outcome) {
        return switch (outcome) {
            case DELIVERED -> {
                subscriptions.recordSuccess(device.id(), clock.instant());
                yield DeviceResult.DELIVERED;
            }
            case GONE -> {
                subscriptions.remove(device.id());
                yield DeviceResult.REMOVED;
            }
            case FAILED -> subscriptions.recordFailure(device.id(), properties.maxFailures())
                    ? DeviceResult.REMOVED
                    : DeviceResult.FAILED;
        };
    }

    private void requireAvailable() {
        if (!setup.available()) {
            throw new ApiProblemException(HttpStatus.CONFLICT, "push_unavailable", "This server does not send push messages.");
        }
    }
}
