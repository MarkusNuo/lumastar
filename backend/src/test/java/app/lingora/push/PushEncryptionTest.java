package app.lingora.push;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.util.Arrays;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;

class PushEncryptionTest {

    /** The example of RFC 8291 appendix A. */
    private static final String PLAINTEXT = "When I grow up, I want to be a watermelon";
    private static final String SERVER_PUBLIC_KEY =
            "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    private static final String SERVER_PRIVATE_KEY = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
    private static final String USER_AGENT_PUBLIC_KEY =
            "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
    private static final String USER_AGENT_PRIVATE_KEY = "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94";
    private static final String AUTH_SECRET = "BTBZMqHH6r4Tts7J_aSIgg";
    private static final String SALT = "DGv6ra1nlYgDCS1FRnbzlw";
    private static final String HEADER =
            "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    private static final String CIPHERTEXT = "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ";

    @Test
    void encryptsTheExampleOfRfc8291Exactly() {
        KeyPair server = new KeyPair(P256.publicKey(Base64Url.decode(SERVER_PUBLIC_KEY)),
                P256.privateKey(Base64Url.decode(SERVER_PRIVATE_KEY)));

        byte[] body = PushEncryption.encrypt(PLAINTEXT.getBytes(StandardCharsets.UTF_8),
                P256.publicKey(Base64Url.decode(USER_AGENT_PUBLIC_KEY)), Base64Url.decode(AUTH_SECRET), server,
                Base64Url.decode(SALT));

        byte[] header = Base64Url.decode(HEADER);
        assertThat(header).hasSize(86);
        assertThat(Arrays.copyOf(body, header.length)).isEqualTo(header);
        assertThat(Arrays.copyOfRange(body, header.length, body.length)).isEqualTo(Base64Url.decode(CIPHERTEXT));
    }

    @Test
    void theUserAgentOfTheExampleDecryptsIt() {
        TestUserAgent userAgent = TestUserAgent.of(USER_AGENT_PUBLIC_KEY, USER_AGENT_PRIVATE_KEY, AUTH_SECRET);
        byte[] body = ByteBuffer.allocate(86 + 58).put(Base64Url.decode(HEADER)).put(Base64Url.decode(CIPHERTEXT)).array();

        assertThat(new String(userAgent.decrypt(body), StandardCharsets.UTF_8)).isEqualTo(PLAINTEXT);
    }

    @Test
    void everyMessageHasItsOwnSaltAndServerKey() {
        TestUserAgent userAgent = TestUserAgent.generate();
        byte[] message = "{\"title\":\"Zeit für Gheg! 🔥\"}".getBytes(StandardCharsets.UTF_8);
        PushSubscription subscription = userAgent.subscription("https://fcm.googleapis.com/fcm/send/a");

        byte[] first = PushEncryption.encrypt(message, subscription.publicKey(), subscription.authSecret());
        byte[] second = PushEncryption.encrypt(message, subscription.publicKey(), subscription.authSecret());

        assertThat(userAgent.decrypt(first)).isEqualTo(message);
        assertThat(userAgent.decrypt(second)).isEqualTo(message);
        assertThat(Arrays.copyOf(first, 86)).isNotEqualTo(Arrays.copyOf(second, 86));
        assertThat(ByteBuffer.wrap(first, 16, 5).getInt()).as("record size").isEqualTo(4096);
        assertThat(first).hasSize(86 + message.length + 1 + 16);
    }

    @Test
    void anotherUserAgentCannotDecryptIt() {
        PushSubscription subscription = TestUserAgent.generate().subscription("https://fcm.googleapis.com/fcm/send/a");
        byte[] body = PushEncryption.encrypt(new byte[] {1, 2, 3}, subscription.publicKey(), subscription.authSecret());

        assertThatThrownBy(() -> TestUserAgent.generate().decrypt(body)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void refusesAPayloadBeyondTheSingleRecord() {
        PushSubscription subscription = TestUserAgent.generate().subscription("https://fcm.googleapis.com/fcm/send/a");

        assertThat(PushEncryption.encrypt(new byte[3993], subscription.publicKey(), subscription.authSecret()))
                .hasSize(4096);
        assertThatThrownBy(() -> PushEncryption.encrypt(new byte[3994], subscription.publicKey(), subscription.authSecret()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void derivesKeysWithHkdfAsRfc5869() {
        // Test case 1 of RFC 5869, first 32 bytes of the output.
        byte[] inputKey = HexFormat.of().parseHex("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b");
        byte[] salt = HexFormat.of().parseHex("000102030405060708090a0b0c");
        byte[] info = HexFormat.of().parseHex("f0f1f2f3f4f5f6f7f8f9");

        assertThat(HexFormat.of().formatHex(PushEncryption.hkdf(salt, inputKey, info, 32)))
                .isEqualTo("3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf");
    }
}
