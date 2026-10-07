package app.lingora.push;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Web push ({@code lingora.push}). Without a key pair web push is off, unless {@code ephemeralKeys} lets the app make
 * a new pair at every start (tests and {@code bootTestRun}; subscriptions do not survive a restart then).
 *
 * @param publicKey     VAPID public key, URL-safe Base64 ({@code LINGORA_PUSH_PUBLIC_KEY})
 * @param privateKey    VAPID private key, URL-safe Base64 ({@code LINGORA_PUSH_PRIVATE_KEY})
 * @param subject       contact for the push services, {@code mailto:} or {@code https:} URL ({@code LINGORA_PUSH_SUBJECT})
 * @param endpointHosts the push services subscriptions may point to, as host names or their parent domains
 *                      ({@code LINGORA_PUSH_ENDPOINT_HOSTS}); the server sends requests to these endpoints, so no other
 *                      host, e.g. of the local network, is accepted
 * @param requireHttps  endpoints must use HTTPS; off only for a local stub push service in tests
 * @param timeout       connect and response timeout of a push request
 */
@ConfigurationProperties("lingora.push")
public record PushProperties(
        String publicKey,
        String privateKey,
        String subject,
        @DefaultValue("false") boolean ephemeralKeys,
        @DefaultValue List<String> endpointHosts,
        @DefaultValue("true") boolean requireHttps,
        @DefaultValue("10s") Duration timeout) {
}
