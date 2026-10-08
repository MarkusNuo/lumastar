package app.lingora.push;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PushSetupTest {

    private static final String SUBJECT = "mailto:lingora@example.org";
    private static final VapidKeys KEYS = VapidKeys.generate();

    @Test
    void isOffWithoutKeys() {
        PushSetup setup = PushSetup.from(properties(null, null, false));

        assertThat(setup.available()).isFalse();
        assertThat(setup.publicKey()).isEmpty();
        assertThatThrownBy(setup::keys).isInstanceOf(IllegalStateException.class);
        assertThat(PushSetup.from(properties(" ", "", false)).available()).as("blank environment variables").isFalse();
    }

    @Test
    void usesTheConfiguredKeys() {
        PushSetup setup = PushSetup.from(properties(KEYS.encodedPublicKey(), KEYS.encodedPrivateKey(), true));

        assertThat(setup.available()).isTrue();
        assertThat(setup.publicKey()).contains(KEYS.encodedPublicKey());
        assertThat(setup.subject()).isEqualTo(SUBJECT);
    }

    @Test
    void makesAnEphemeralPairOnlyWithoutConfiguredKeys() {
        PushSetup first = PushSetup.from(properties(null, null, true));
        PushSetup second = PushSetup.from(properties(null, null, true));

        assertThat(first.available()).isTrue();
        assertThat(first.publicKey()).isNotEqualTo(second.publicKey());
    }

    @Test
    void refusesToStartWithHalfOrBrokenConfiguration() {
        assertThatThrownBy(() -> PushSetup.from(properties(KEYS.encodedPublicKey(), null, true)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("LINGORA_PUSH_PRIVATE_KEY");
        assertThatThrownBy(() -> PushSetup.from(properties(KEYS.encodedPublicKey(), VapidKeys.generate().encodedPrivateKey(),
                false))).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Invalid VAPID keys");
    }

    @ParameterizedTest
    @ValueSource(strings = {"mailto:lingora@example.org", "https://lingora.example.org", "http://localhost:5173",
            "http://127.0.0.1:4173", "http://[::1]:5173"})
    void acceptsAContactUrlAndPlainHttpOnlyOnTheLocalMachine(String subject) {
        assertThat(PushSetup.of(KEYS, subject).available()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"lingora@example.org", "http://lingora.example.org", "http://127.example.org",
            "http://192.168.1.10:5173", "mailto:", "https://", "ftp://lingora.example.org", "https://lingora .example.org"})
    void refusesAnyOtherSubject(String subject) {
        assertThatThrownBy(() -> PushSetup.of(KEYS, subject)).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("LINGORA_PUSH_SUBJECT");
    }

    @Test
    void needsASubject() {
        assertThatThrownBy(() -> PushSetup.of(KEYS, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void neverPrintsThePrivateKey() {
        PushProperties properties = properties(KEYS.encodedPublicKey(), KEYS.encodedPrivateKey(), false);

        assertThat(properties.toString()).doesNotContain(KEYS.encodedPrivateKey())
                .contains("publicKey=" + KEYS.encodedPublicKey(), "privateKey=(redacted)", "subject=" + SUBJECT);
        assertThat(properties(null, null, true).toString()).contains("privateKey=null");
        assertThat(KEYS.toString()).doesNotContain(KEYS.encodedPrivateKey());
    }

    private static PushProperties properties(String publicKey, String privateKey, boolean ephemeral) {
        return new PushProperties(publicKey, privateKey, SUBJECT, ephemeral, List.of("fcm.googleapis.com"), true,
                Duration.ofSeconds(10), 10, 5, 4);
    }
}
