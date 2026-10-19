package app.lumastar.push;

import jakarta.validation.constraints.Min;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Web push ({@code lumastar.push}). Without a key pair web push is off, unless {@code ephemeralKeys} lets the app make
 * a new pair at every start (tests and {@code bootTestRun}; subscriptions do not survive a restart then).
 *
 * @param publicKey     VAPID public key, URL-safe Base64 ({@code LUMASTAR_PUSH_PUBLIC_KEY})
 * @param privateKey    VAPID private key, URL-safe Base64 ({@code LUMASTAR_PUSH_PRIVATE_KEY}); never part of
 *                      {@link #toString()}
 * @param subject       contact for the push services, {@code mailto:} or {@code https:} URL ({@code LUMASTAR_PUSH_SUBJECT})
 * @param endpointHosts the push services subscriptions may point to, as host names or their parent domains
 *                      ({@code LUMASTAR_PUSH_ENDPOINT_HOSTS}); the server sends requests to these endpoints, so no other
 *                      host, e.g. of the local network, is accepted
 * @param requireHttps  endpoints must use HTTPS on its default port; off only for a local stub push service in tests
 * @param timeout       connect and response timeout of a push request
 * @param maxDevices    devices per learner; registering one more removes the one not seen for the longest time
 * @param maxFailures   failed deliveries in a row after which a device is removed
 * @param parallelSends push requests sent at the same time, so that a slow push service holds up few others
 */
@Validated
@ConfigurationProperties("lumastar.push")
public record PushProperties(
        String publicKey,
        String privateKey,
        String subject,
        @DefaultValue("false") boolean ephemeralKeys,
        @DefaultValue List<String> endpointHosts,
        @DefaultValue("true") boolean requireHttps,
        @DefaultValue("10s") Duration timeout,
        @DefaultValue("10") @Min(1) int maxDevices,
        @DefaultValue("5") @Min(1) int maxFailures,
        @DefaultValue("4") @Min(1) int parallelSends) {

    @Override
    public String toString() {
        return ("PushProperties[publicKey=%s, privateKey=%s, subject=%s, ephemeralKeys=%s, endpointHosts=%s, "
                + "requireHttps=%s, timeout=%s, maxDevices=%d, maxFailures=%d, parallelSends=%d]").formatted(publicKey,
                privateKey == null ? null : "(redacted)", subject, ephemeralKeys, endpointHosts, requireHttps, timeout,
                maxDevices, maxFailures, parallelSends);
    }
}
