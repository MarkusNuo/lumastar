package app.lingora.api.push;

import app.lingora.api.auth.RequestThrottle;
import app.lingora.api.auth.RequestThrottle.Action;
import app.lingora.api.error.ApiProblemException;
import app.lingora.core.reminder.ReminderMessages;
import app.lingora.persistence.PushSubscriptionStore;
import app.lingora.persistence.PushSubscriptionStore.StoredSubscription;
import app.lingora.push.NotificationKind;
import app.lingora.push.PushEndpoints;
import app.lingora.push.PushNotification;
import app.lingora.push.PushSender;
import app.lingora.push.PushSetup;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * The learner's devices for web push and the delivery of notifications to all of them. A subscription the push service
 * reports as gone is deleted; other failures are counted.
 */
@Service
public class PushDevices {

    /** A test notification is pointless once the learner has stopped waiting for it. */
    private static final Duration TEST_TIME_TO_LIVE = Duration.ofMinutes(10);

    private final PushSubscriptionStore subscriptions;
    private final PushSender sender;
    private final PushSetup setup;
    private final PushEndpoints endpoints;
    private final RequestThrottle throttle;
    private final Clock clock;

    PushDevices(PushSubscriptionStore subscriptions, PushSender sender, PushSetup setup, PushEndpoints endpoints,
                RequestThrottle throttle, Clock clock) {
        this.subscriptions = subscriptions;
        this.sender = sender;
        this.setup = setup;
        this.endpoints = endpoints;
        this.throttle = throttle;
        this.clock = clock;
    }

    /** How a notification went to the learner's devices. */
    public record Delivery(int devices, int delivered, int removed) {
    }

    List<StoredSubscription> of(UUID userId) {
        return subscriptions.of(userId);
    }

    StoredSubscription subscribe(UUID userId, PushSubscriptionRequest request) {
        requireAvailable();
        if (!endpoints.isAllowed(request.endpoint().strip())) {
            throw new ApiProblemException(HttpStatus.BAD_REQUEST, "push_service_not_supported",
                    "The endpoint does not belong to a supported push service.");
        }
        return subscriptions.save(userId, request.subscription(), request.deviceLabel(), clock.instant());
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
        Delivery delivery = deliver(userId, notification, TEST_TIME_TO_LIVE);
        return new PushTestResponse(delivery.devices(), delivery.delivered(), delivery.removed(), notification);
    }

    /** Sends the notification to every device of the learner; web push must be {@linkplain PushSetup#available() on}. */
    public Delivery deliver(UUID userId, PushNotification notification, Duration timeToLive) {
        List<StoredSubscription> devices = subscriptions.of(userId);
        int delivered = 0;
        int removed = 0;
        for (StoredSubscription device : devices) {
            switch (sender.send(device.subscription(), notification, timeToLive)) {
                case DELIVERED -> {
                    subscriptions.recordSuccess(device.id(), clock.instant());
                    delivered++;
                }
                case GONE -> {
                    subscriptions.remove(device.id());
                    removed++;
                }
                case FAILED -> subscriptions.recordFailure(device.id());
            }
        }
        return new Delivery(devices.size(), delivered, removed);
    }

    private void requireAvailable() {
        if (!setup.available()) {
            throw new ApiProblemException(HttpStatus.CONFLICT, "push_unavailable", "This server does not send push messages.");
        }
    }
}
