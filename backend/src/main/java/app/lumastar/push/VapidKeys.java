package app.lumastar.push;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.util.Objects;

/**
 * The application server key pair of VAPID (RFC 8292), with which Lumastar identifies itself to the push services:
 * browsers subscribe with the public key, and every push message carries a token signed with the private key.
 * Encoded as URL-safe Base64, like the keys of {@code npx web-push generate-vapid-keys}.
 */
record VapidKeys(ECPublicKey publicKey, ECPrivateKey privateKey) {

    VapidKeys {
        Objects.requireNonNull(publicKey, "publicKey");
        Objects.requireNonNull(privateKey, "privateKey");
    }

    static VapidKeys generate() {
        KeyPair pair = P256.generateKeyPair();
        return new VapidKeys((ECPublicKey) pair.getPublic(), (ECPrivateKey) pair.getPrivate());
    }

    /** @throws IllegalArgumentException if a key is malformed or the public key does not belong to the private one */
    static VapidKeys decode(String publicKey, String privateKey) {
        VapidKeys keys = new VapidKeys(P256.publicKey(Base64Url.decode(publicKey.strip())),
                P256.privateKey(Base64Url.decode(privateKey.strip())));
        if (!keys.belongTogether()) {
            throw new IllegalArgumentException("the public key does not belong to the private key");
        }
        return keys;
    }

    String encodedPublicKey() {
        return Base64Url.encode(P256.encode(publicKey));
    }

    String encodedPrivateKey() {
        return Base64Url.encode(P256.encode(privateKey));
    }

    private boolean belongTogether() {
        byte[] probe = "lumastar".getBytes(StandardCharsets.US_ASCII);
        try {
            Signature signer = Signature.getInstance(Vapid.SIGNATURE_ALGORITHM);
            signer.initSign(privateKey);
            signer.update(probe);
            byte[] signature = signer.sign();
            Signature verifier = Signature.getInstance(Vapid.SIGNATURE_ALGORITHM);
            verifier.initVerify(publicKey);
            verifier.update(probe);
            return verifier.verify(signature);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Every Java platform supports ECDSA with SHA-256", e);
        }
    }

    @Override
    public String toString() {
        return "VapidKeys[publicKey=" + encodedPublicKey() + "]";
    }
}
