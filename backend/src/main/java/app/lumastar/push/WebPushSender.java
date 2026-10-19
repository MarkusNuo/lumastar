package app.lumastar.push;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.json.JsonMapper;

/**
 * Web push (RFC 8030) with VAPID (RFC 8292) and message encryption (RFC 8291) on the JDK's own cryptography and HTTP
 * client. The notification's tag is the {@code Topic}, so a push service holding an undelivered notification for an
 * offline device replaces it with the newer one of the same kind.
 */
final class WebPushSender implements PushSender, AutoCloseable {

    private static final Logger LOG = LoggerFactory.getLogger(WebPushSender.class);
    /** RFC 8292 allows at most 24 hours. */
    private static final Duration TOKEN_VALIDITY = Duration.ofHours(12);
    private static final int MAX_LOGGED_RESPONSE = 200;

    private final PushSetup setup;
    private final HttpClient http;
    private final JsonMapper json;
    private final Clock clock;
    private final Duration timeout;

    WebPushSender(PushSetup setup, JsonMapper json, Clock clock, Duration timeout) {
        this.setup = setup;
        this.json = json;
        this.clock = clock;
        this.timeout = timeout;
        this.http = HttpClient.newBuilder()
                .connectTimeout(timeout)
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    @Override
    public PushOutcome send(PushSubscription subscription, PushNotification notification, Duration timeToLive) {
        URI endpoint = URI.create(subscription.endpoint());
        byte[] body = PushEncryption.encrypt(json.writeValueAsBytes(notification), subscription.publicKey(),
                subscription.authSecret());
        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .timeout(timeout)
                .header("Authorization", Vapid.authorization(setup.keys(), setup.subject(), endpoint,
                        clock.instant().plus(TOKEN_VALIDITY)))
                .header("Content-Encoding", "aes128gcm")
                .header("Content-Type", "application/octet-stream")
                .header("TTL", Long.toString(Math.max(0, timeToLive.toSeconds())))
                .header("Urgency", "normal")
                .header("Topic", notification.tag())
                .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            PushOutcome outcome = outcome(response.statusCode());
            if (outcome == PushOutcome.FAILED) {
                LOG.warn("Push service {} refused a message: {} {}", endpoint.getHost(), response.statusCode(),
                        abbreviated(response.body()));
            }
            return outcome;
        } catch (IOException e) {
            LOG.warn("Push service {} not reachable: {}", endpoint.getHost(), e.toString());
            return PushOutcome.FAILED;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return PushOutcome.FAILED;
        }
    }

    static PushOutcome outcome(int status) {
        if (status >= 200 && status < 300) {
            return PushOutcome.DELIVERED;
        }
        return status == 404 || status == 410 ? PushOutcome.GONE : PushOutcome.FAILED;
    }

    @Override
    public void close() {
        http.close();
    }

    private static String abbreviated(String text) {
        return text.length() <= MAX_LOGGED_RESPONSE ? text : text.substring(0, MAX_LOGGED_RESPONSE) + "…";
    }
}
