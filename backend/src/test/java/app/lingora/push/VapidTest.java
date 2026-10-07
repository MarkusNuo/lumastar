package app.lingora.push;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.Signature;
import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class VapidTest {

    private static final Pattern HEADER = Pattern.compile("vapid t=([\\w-]+)\\.([\\w-]+)\\.([\\w-]+), k=([\\w-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Test
    void signsATokenForTheOriginOfThePushService() throws GeneralSecurityException {
        VapidKeys keys = VapidKeys.generate();
        Instant expiresAt = Instant.parse("2026-10-07T19:00:00Z");

        String authorization = Vapid.authorization(keys, "mailto:lingora@example.org",
                URI.create("https://fcm.googleapis.com/fcm/send/abc:def"), expiresAt);

        Matcher token = HEADER.matcher(authorization);
        assertThat(token.matches()).as(authorization).isTrue();
        assertThat(json(token.group(1))).isEqualTo(JSON.readTree("{\"typ\":\"JWT\",\"alg\":\"ES256\"}"));
        assertThat(json(token.group(2))).isEqualTo(JSON.readTree("""
                {"aud": "https://fcm.googleapis.com", "exp": 1791399600, "sub": "mailto:lingora@example.org"}"""));
        assertThat(token.group(4)).isEqualTo(keys.encodedPublicKey());
        byte[] signature = Base64Url.decode(token.group(3));
        assertThat(signature).as("ES256 is r and s, 32 bytes each").hasSize(64);
        Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
        verifier.initVerify(P256.publicKey(Base64Url.decode(token.group(4))));
        verifier.update((token.group(1) + "." + token.group(2)).getBytes(StandardCharsets.US_ASCII));
        assertThat(verifier.verify(signature)).isTrue();
    }

    @Test
    void theAudienceIsTheOriginWithoutDefaultPort() {
        assertThat(Vapid.audience(URI.create("https://updates.push.services.mozilla.com/wpush/v2/gAAA")))
                .isEqualTo("https://updates.push.services.mozilla.com");
        assertThat(Vapid.audience(URI.create("https://Web.Push.Apple.com:443/QGuQ"))).isEqualTo("https://web.push.apple.com");
        assertThat(Vapid.audience(URI.create("http://127.0.0.1:8099/push/1"))).isEqualTo("http://127.0.0.1:8099");
    }

    @Test
    void keysRoundTripInTheirEncoding() {
        VapidKeys keys = VapidKeys.generate();

        VapidKeys decoded = VapidKeys.decode(keys.encodedPublicKey(), keys.encodedPrivateKey());

        assertThat(decoded.encodedPublicKey()).isEqualTo(keys.encodedPublicKey()).hasSize(87).startsWith("B");
        assertThat(decoded.encodedPrivateKey()).isEqualTo(keys.encodedPrivateKey()).hasSize(43);
        assertThat(decoded.toString()).doesNotContain(keys.encodedPrivateKey());
    }

    @Test
    void acceptsAKeyPairOfOtherTools() {
        // The application server key pair of the example in RFC 8291 appendix A.
        VapidKeys keys = VapidKeys.decode(
                "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
                "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw");

        assertThat(keys.encodedPrivateKey()).isEqualTo("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw");
    }

    @Test
    void refusesKeysThatDoNotBelongTogether() {
        VapidKeys one = VapidKeys.generate();
        VapidKeys other = VapidKeys.generate();

        assertThatThrownBy(() -> VapidKeys.decode(one.encodedPublicKey(), other.encodedPrivateKey()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("does not belong");
    }

    @Test
    void refusesMalformedKeys() {
        VapidKeys keys = VapidKeys.generate();
        String offTheCurve = "B" + "A".repeat(86);

        assertThatThrownBy(() -> VapidKeys.decode(offTheCurve, keys.encodedPrivateKey()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> VapidKeys.decode(keys.encodedPublicKey(), "too-short"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> VapidKeys.decode("not base64!", keys.encodedPrivateKey()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> VapidKeys.decode(keys.encodedPublicKey(), "A".repeat(43)))
                .as("the scalar 0").isInstanceOf(IllegalArgumentException.class);
    }

    private static JsonNode json(String base64Url) {
        return JSON.readTree(Base64Url.decode(base64Url));
    }
}
