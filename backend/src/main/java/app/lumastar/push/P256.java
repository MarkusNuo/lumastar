package app.lumastar.push;

import java.math.BigInteger;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECFieldFp;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.ECPublicKeySpec;
import java.security.spec.EllipticCurve;
import java.util.Arrays;

/**
 * Keys of the NIST P-256 curve in the encoding of web push (RFC 8291, 8292): a public key is an uncompressed point
 * ({@code 0x04 ‖ x ‖ y}, 65 bytes), a private key its 32-byte big-endian scalar.
 */
final class P256 {

    static final int PUBLIC_KEY_LENGTH = 65;
    private static final int FIELD_LENGTH = 32;
    private static final byte UNCOMPRESSED = 0x04;
    private static final ECGenParameterSpec CURVE = new ECGenParameterSpec("secp256r1");
    private static final ECParameterSpec PARAMETERS = parameters();

    private P256() {
    }

    static KeyPair generateKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
            generator.initialize(CURVE);
            return generator.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Every Java platform supports P-256", e);
        }
    }

    /** @throws IllegalArgumentException if the bytes are no uncompressed point of the curve */
    static ECPublicKey publicKey(byte[] encoded) {
        if (encoded.length != PUBLIC_KEY_LENGTH || encoded[0] != UNCOMPRESSED) {
            throw new IllegalArgumentException("a P-256 public key has 65 bytes and starts with 0x04");
        }
        BigInteger x = new BigInteger(1, Arrays.copyOfRange(encoded, 1, 1 + FIELD_LENGTH));
        BigInteger y = new BigInteger(1, Arrays.copyOfRange(encoded, 1 + FIELD_LENGTH, PUBLIC_KEY_LENGTH));
        // A point off the curve would leak the private key in the key agreement (invalid curve attack).
        if (!isOnCurve(x, y)) {
            throw new IllegalArgumentException("the point is not on the P-256 curve");
        }
        try {
            return (ECPublicKey) KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(new ECPoint(x, y), PARAMETERS));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("not a P-256 public key", e);
        }
    }

    /** @throws IllegalArgumentException if the bytes are no valid private scalar */
    static ECPrivateKey privateKey(byte[] encoded) {
        BigInteger scalar = new BigInteger(1, encoded);
        if (encoded.length != FIELD_LENGTH || scalar.signum() == 0 || scalar.compareTo(PARAMETERS.getOrder()) >= 0) {
            throw new IllegalArgumentException("a P-256 private key is a 32-byte scalar below the order of the curve");
        }
        try {
            return (ECPrivateKey) KeyFactory.getInstance("EC").generatePrivate(new ECPrivateKeySpec(scalar, PARAMETERS));
        } catch (GeneralSecurityException e) {
            throw new IllegalArgumentException("not a P-256 private key", e);
        }
    }

    static byte[] encode(ECPublicKey key) {
        byte[] encoded = new byte[PUBLIC_KEY_LENGTH];
        encoded[0] = UNCOMPRESSED;
        writeUnsigned(key.getW().getAffineX(), encoded, 1);
        writeUnsigned(key.getW().getAffineY(), encoded, 1 + FIELD_LENGTH);
        return encoded;
    }

    static byte[] encode(ECPrivateKey key) {
        byte[] encoded = new byte[FIELD_LENGTH];
        writeUnsigned(key.getS(), encoded, 0);
        return encoded;
    }

    private static boolean isOnCurve(BigInteger x, BigInteger y) {
        EllipticCurve curve = PARAMETERS.getCurve();
        BigInteger p = ((ECFieldFp) curve.getField()).getP();
        if (x.compareTo(p) >= 0 || y.compareTo(p) >= 0) {
            return false;
        }
        BigInteger right = x.pow(3).add(curve.getA().multiply(x)).add(curve.getB()).mod(p);
        return y.pow(2).mod(p).equals(right);
    }

    /** {@code value} as {@value #FIELD_LENGTH} big-endian bytes at {@code offset}. */
    private static void writeUnsigned(BigInteger value, byte[] target, int offset) {
        byte[] bytes = value.toByteArray();
        int length = Math.min(bytes.length, FIELD_LENGTH);
        System.arraycopy(bytes, bytes.length - length, target, offset + FIELD_LENGTH - length, length);
    }

    private static ECParameterSpec parameters() {
        try {
            AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
            parameters.init(CURVE);
            return parameters.getParameterSpec(ECParameterSpec.class);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Every Java platform supports P-256", e);
        }
    }
}
