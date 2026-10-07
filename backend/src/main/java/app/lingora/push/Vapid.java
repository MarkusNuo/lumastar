package app.lingora.push;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.Signature;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import tools.jackson.databind.json.JsonMapper;

/**
 * The {@code Authorization} header of VAPID (RFC 8292): a JWT for the push service's origin, signed with ES256, and
 * the public key it can be verified with.
 */
final class Vapid {

    /** ES256 as JWS needs it: the signature as the plain {@code r ‖ s}, not DER. */
    static final String SIGNATURE_ALGORITHM = "SHA256withECDSAinP1363Format";
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String HEADER = Base64Url.encode("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.UTF_8));

    private Vapid() {
    }

    /**
     * @param subject   contact of the application server, a {@code mailto:} or {@code https:} URL
     * @param expiresAt at most 24 hours ahead (RFC 8292 section 2)
     */
    static String authorization(VapidKeys keys, String subject, URI endpoint, Instant expiresAt) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("aud", audience(endpoint));
        claims.put("exp", expiresAt.getEpochSecond());
        claims.put("sub", subject);
        String signingInput = HEADER + "." + Base64Url.encode(JSON.writeValueAsBytes(claims));
        return "vapid t=%s.%s, k=%s".formatted(signingInput, Base64Url.encode(sign(keys, signingInput)), keys.encodedPublicKey());
    }

    /** The origin of the endpoint, the push service the token is for; a default port is left out as in any origin. */
    static String audience(URI endpoint) {
        String scheme = endpoint.getScheme().toLowerCase(Locale.ROOT);
        String origin = scheme + "://" + endpoint.getHost().toLowerCase(Locale.ROOT);
        int port = endpoint.getPort();
        boolean defaultPort = port == -1 || port == 443 && scheme.equals("https") || port == 80 && scheme.equals("http");
        return defaultPort ? origin : origin + ":" + port;
    }

    private static byte[] sign(VapidKeys keys, String signingInput) {
        try {
            Signature signature = Signature.getInstance(SIGNATURE_ALGORITHM);
            signature.initSign(keys.privateKey());
            signature.update(signingInput.getBytes(StandardCharsets.US_ASCII));
            return signature.sign();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Signing the VAPID token failed", e);
        }
    }
}
