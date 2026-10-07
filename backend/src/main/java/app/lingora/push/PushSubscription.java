package app.lingora.push;

import java.security.interfaces.ECPublicKey;
import java.util.Objects;

/**
 * Where and for whom a push message is encrypted: the subscription a browser created with {@code pushManager.subscribe}
 * ({@code PushSubscription.toJSON()}), its keys as URL-safe Base64 without padding.
 *
 * @param endpoint the URL of the push service for this subscription
 * @param p256dh   the subscription's P-256 public key (65 bytes)
 * @param auth     the authentication secret (16 bytes)
 */
public record PushSubscription(String endpoint, String p256dh, String auth) {

    private static final int AUTH_SECRET_LENGTH = 16;

    public PushSubscription {
        Objects.requireNonNull(endpoint, "endpoint");
        p256dh = normalized(p256dh);
        auth = normalized(auth);
    }

    /** Whether {@code p256dh} is a P-256 public key, in standard or URL-safe Base64, with or without padding. */
    public static boolean isPublicKey(String p256dh) {
        try {
            P256.publicKey(Base64Url.decode(normalized(p256dh)));
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    /** Whether {@code auth} is an authentication secret of 16 bytes, in standard or URL-safe Base64. */
    public static boolean isAuthSecret(String auth) {
        try {
            return Base64Url.decode(normalized(auth)).length == AUTH_SECRET_LENGTH;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    ECPublicKey publicKey() {
        return P256.publicKey(Base64Url.decode(p256dh));
    }

    byte[] authSecret() {
        return Base64Url.decode(auth);
    }

    /** URL-safe Base64 without padding; some browsers have sent keys in standard Base64. */
    private static String normalized(String key) {
        return Objects.requireNonNull(key, "key").strip().replace('+', '-').replace('/', '_').replace("=", "");
    }
}
