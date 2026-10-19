package app.lumastar.push;

import java.time.Duration;

/** Sends push messages to the push services of the learners' browsers. */
public interface PushSender {

    /**
     * Sends one notification to one subscription. Only called while {@link PushSetup#available()}.
     *
     * @param timeToLive how long the push service may hold the message while the device is offline
     */
    PushOutcome send(PushSubscription subscription, PushNotification notification, Duration timeToLive);
}
