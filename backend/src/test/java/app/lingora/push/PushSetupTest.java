package app.lingora.push;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

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

    @Test
    void needsAContactUrlAsSubject() {
        assertThatThrownBy(() -> PushSetup.of(KEYS, "lingora@example.org")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PushSetup.of(KEYS, null)).isInstanceOf(IllegalArgumentException.class);
        assertThat(PushSetup.of(KEYS, "https://lingora.example.org").available()).isTrue();
    }

    private static PushProperties properties(String publicKey, String privateKey, boolean ephemeral) {
        return new PushProperties(publicKey, privateKey, SUBJECT, ephemeral, List.of("fcm.googleapis.com"), true,
                Duration.ofSeconds(10));
    }
}
