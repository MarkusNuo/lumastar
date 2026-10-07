package app.lingora.push;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class PushSubscriptionTest {

    private final TestUserAgent browser = TestUserAgent.generate();

    @Test
    void acceptsTheKeysOfABrowser() {
        assertThat(PushSubscription.isPublicKey(browser.p256dh())).isTrue();
        assertThat(PushSubscription.isAuthSecret(browser.auth())).isTrue();
    }

    @Test
    void storesKeysAsUrlSafeBase64WithoutPadding() {
        byte[] publicKey = Base64Url.decode(browser.p256dh());
        String standard = Base64.getEncoder().encodeToString(publicKey);

        PushSubscription subscription = new PushSubscription("https://fcm.googleapis.com/fcm/send/a", standard,
                browser.auth() + "==");

        assertThat(PushSubscription.isPublicKey(standard)).isTrue();
        assertThat(subscription.p256dh()).isEqualTo(browser.p256dh()).hasSize(87);
        assertThat(subscription.auth()).isEqualTo(browser.auth()).hasSize(22);
    }

    @Test
    void refusesKeysThatAreNoPointOrSecret() {
        assertThat(PushSubscription.isPublicKey("B" + "A".repeat(86))).as("not on the curve").isFalse();
        assertThat(PushSubscription.isPublicKey(browser.p256dh().substring(0, 43))).as("too short").isFalse();
        assertThat(PushSubscription.isPublicKey("BAD KEY!")).isFalse();
        assertThat(PushSubscription.isAuthSecret(browser.p256dh())).as("too long").isFalse();
        assertThat(PushSubscription.isAuthSecret("$$$")).isFalse();
    }
}
