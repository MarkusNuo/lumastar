package app.lumastar.push;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.SecureRandom;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * The browser side of web push for tests: a subscription key pair and authentication secret, and the decryption of
 * push messages (RFC 8291) as a browser does it.
 */
public final class TestUserAgent {

    private final KeyPair keys;
    private final byte[] authSecret;

    private TestUserAgent(KeyPair keys, byte[] authSecret) {
        this.keys = keys;
        this.authSecret = authSecret;
    }

    public static TestUserAgent generate() {
        byte[] authSecret = new byte[16];
        new SecureRandom().nextBytes(authSecret);
        return new TestUserAgent(P256.generateKeyPair(), authSecret);
    }

    static TestUserAgent of(String publicKey, String privateKey, String authSecret) {
        return new TestUserAgent(new KeyPair(P256.publicKey(Base64Url.decode(publicKey)),
                P256.privateKey(Base64Url.decode(privateKey))), Base64Url.decode(authSecret));
    }

    public String p256dh() {
        return Base64Url.encode(P256.encode((ECPublicKey) keys.getPublic()));
    }

    public String auth() {
        return Base64Url.encode(authSecret);
    }

    public PushSubscription subscription(String endpoint) {
        return new PushSubscription(endpoint, p256dh(), auth());
    }

    /** The plaintext of a push message body: header, then a single record ending with the delimiter 0x02. */
    public byte[] decrypt(byte[] body) {
        ByteBuffer buffer = ByteBuffer.wrap(body);
        byte[] salt = new byte[16];
        buffer.get(salt);
        int recordSize = buffer.getInt();
        byte[] serverKey = new byte[buffer.get()];
        buffer.get(serverKey);
        byte[] record = new byte[buffer.remaining()];
        buffer.get(record);
        if (record.length > recordSize) {
            throw new IllegalArgumentException("more than one record");
        }
        byte[] keyInfo = concat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), p256dhBytes(), serverKey);
        byte[] inputKey = PushEncryption.hkdf(authSecret, agree(P256.publicKey(serverKey)), keyInfo, 32);
        byte[] contentKey = PushEncryption.hkdf(salt, inputKey, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
        byte[] nonce = PushEncryption.hkdf(salt, inputKey, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);
        byte[] padded = open(record, contentKey, nonce);
        int end = padded.length - 1;
        while (end >= 0 && padded[end] == 0) {
            end--;
        }
        if (end < 0 || padded[end] != 0x02) {
            throw new IllegalArgumentException("the record does not end with the last-record delimiter");
        }
        return Arrays.copyOf(padded, end);
    }

    private byte[] p256dhBytes() {
        return P256.encode((ECPublicKey) keys.getPublic());
    }

    private byte[] agree(ECPublicKey serverKey) {
        try {
            KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
            agreement.init((ECPrivateKey) keys.getPrivate());
            agreement.doPhase(serverKey, true);
            return agreement.generateSecret();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] open(byte[] record, byte[] key, byte[] nonce) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, nonce));
            return cipher.doFinal(record);
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("the record cannot be decrypted", e);
        }
    }

    private static byte[] concat(byte[]... parts) {
        int length = Arrays.stream(parts).mapToInt(part -> part.length).sum();
        ByteBuffer joined = ByteBuffer.allocate(length);
        Arrays.stream(parts).forEach(joined::put);
        return joined.array();
    }
}
