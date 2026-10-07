package app.lingora.push;

import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Whether web push is on, and with which VAPID keys: the configured pair, an ephemeral one, or none, which switches web
 * push off (the API reports it and no reminder is sent).
 */
public final class PushSetup {

    private static final Logger LOG = LoggerFactory.getLogger(PushSetup.class);

    private final VapidKeys keys;
    private final String subject;

    private PushSetup(VapidKeys keys, String subject) {
        this.keys = keys;
        this.subject = subject;
    }

    public static PushSetup disabled() {
        return new PushSetup(null, null);
    }

    /**
     * @param subject contact of the push services: a {@code mailto:} or {@code https:} URL (Apple refuses others);
     *                {@code http:} only for local development
     */
    static PushSetup of(VapidKeys keys, String subject) {
        if (subject == null || !(subject.startsWith("mailto:") || subject.startsWith("https://") || subject.startsWith("http://"))) {
            throw new IllegalArgumentException("lingora.push.subject (LINGORA_PUSH_SUBJECT) must be a mailto: or https: URL, "
                    + "found " + subject);
        }
        return new PushSetup(keys, subject);
    }

    /**
     * @throws IllegalArgumentException if only one key is set, a key is malformed or the keys do not belong together
     */
    static PushSetup from(PushProperties properties) {
        boolean hasPublicKey = isSet(properties.publicKey());
        boolean hasPrivateKey = isSet(properties.privateKey());
        if (hasPublicKey != hasPrivateKey) {
            throw new IllegalArgumentException("Web push needs both LINGORA_PUSH_PUBLIC_KEY and LINGORA_PUSH_PRIVATE_KEY");
        }
        if (hasPublicKey) {
            try {
                return of(VapidKeys.decode(properties.publicKey(), properties.privateKey()), properties.subject());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid VAPID keys (LINGORA_PUSH_PUBLIC_KEY, LINGORA_PUSH_PRIVATE_KEY): "
                        + e.getMessage(), e);
            }
        }
        if (properties.ephemeralKeys()) {
            PushSetup ephemeral = of(VapidKeys.generate(), properties.subject());
            LOG.info("Web push uses an ephemeral VAPID key pair; subscriptions end with this run");
            return ephemeral;
        }
        LOG.info("Web push is off: no VAPID keys (LINGORA_PUSH_PUBLIC_KEY, LINGORA_PUSH_PRIVATE_KEY) are configured");
        return disabled();
    }

    public boolean available() {
        return keys != null;
    }

    /** The key browsers subscribe with ({@code applicationServerKey}); empty while web push is off. */
    public Optional<String> publicKey() {
        return Optional.ofNullable(keys).map(VapidKeys::encodedPublicKey);
    }

    VapidKeys keys() {
        if (keys == null) {
            throw new IllegalStateException("web push is off");
        }
        return keys;
    }

    String subject() {
        return subject;
    }

    private static boolean isSet(String value) {
        return value != null && !value.isBlank();
    }
}
