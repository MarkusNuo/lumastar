package app.lingora.push;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.SecureRandom;
import java.security.interfaces.ECPublicKey;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Message encryption of web push (RFC 8291 with the {@code aes128gcm} content coding of RFC 8188). Every message gets
 * a new server key pair and salt; the key agreed with the subscription's public key and its authentication secret
 * seals the message as a single record.
 */
final class PushEncryption {

    /** RFC 8291 section 4: what fits into one record of a push message of at most 4096 bytes. */
    static final int MAX_PLAINTEXT_LENGTH = 3993;
    static final int SALT_LENGTH = 16;
    static final int RECORD_SIZE = 4096;
    private static final int AUTH_SECRET_LENGTH = 16;
    private static final int TAG_BITS = 128;
    private static final byte LAST_RECORD_DELIMITER = 0x02;
    private static final byte[] KEY_INFO = "WebPush: info\0".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] CEK_INFO = "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] NONCE_INFO = "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII);
    private static final SecureRandom RANDOM = new SecureRandom();

    private PushEncryption() {
    }

    /** The body of a push message: header (salt, record size, server public key) and the sealed record. */
    static byte[] encrypt(byte[] plaintext, ECPublicKey userAgentKey, byte[] authSecret) {
        byte[] salt = new byte[SALT_LENGTH];
        RANDOM.nextBytes(salt);
        return encrypt(plaintext, userAgentKey, authSecret, P256.generateKeyPair(), salt);
    }

    /** With a given server key pair and salt, as in the example of RFC 8291 appendix A. */
    static byte[] encrypt(byte[] plaintext, ECPublicKey userAgentKey, byte[] authSecret, KeyPair server, byte[] salt) {
        if (plaintext.length > MAX_PLAINTEXT_LENGTH) {
            throw new IllegalArgumentException("a push message holds at most %d bytes, not %d"
                    .formatted(MAX_PLAINTEXT_LENGTH, plaintext.length));
        }
        if (authSecret.length != AUTH_SECRET_LENGTH || salt.length != SALT_LENGTH) {
            throw new IllegalArgumentException("the authentication secret and the salt have 16 bytes each");
        }
        byte[] serverPublicKey = P256.encode((ECPublicKey) server.getPublic());
        byte[] keyInfo = concat(KEY_INFO, P256.encode(userAgentKey), serverPublicKey);
        byte[] inputKey = hkdf(authSecret, agree(server, userAgentKey), keyInfo, 32);
        byte[] contentKey = hkdf(salt, inputKey, CEK_INFO, 16);
        byte[] nonce = hkdf(salt, inputKey, NONCE_INFO, 12);
        byte[] header = ByteBuffer.allocate(SALT_LENGTH + 4 + 1 + serverPublicKey.length)
                .put(salt).putInt(RECORD_SIZE).put((byte) serverPublicKey.length).put(serverPublicKey)
                .array();
        return concat(header, seal(concat(plaintext, new byte[] {LAST_RECORD_DELIMITER}), contentKey, nonce));
    }

    /** HKDF with SHA-256 (RFC 5869), for at most 32 bytes of output: one block of the expansion. */
    static byte[] hkdf(byte[] salt, byte[] inputKey, byte[] info, int length) {
        byte[] pseudoRandomKey = hmac(salt, inputKey);
        return Arrays.copyOf(hmac(pseudoRandomKey, concat(info, new byte[] {1})), length);
    }

    private static byte[] agree(KeyPair server, ECPublicKey userAgentKey) {
        try {
            KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
            agreement.init(server.getPrivate());
            agreement.doPhase(userAgentKey, true);
            return agreement.generateSecret();
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("no key agreement with the subscription's key", e);
        }
    }

    private static byte[] seal(byte[] record, byte[] key, byte[] nonce) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(TAG_BITS, nonce));
            return cipher.doFinal(record);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Every Java platform supports AES-GCM", e);
        }
    }

    private static byte[] hmac(byte[] key, byte[] data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Every Java platform supports HMAC-SHA256", e);
        }
    }

    private static byte[] concat(byte[]... parts) {
        ByteArrayOutputStream joined = new ByteArrayOutputStream();
        for (byte[] part : parts) {
            joined.writeBytes(part);
        }
        return joined.toByteArray();
    }
}
