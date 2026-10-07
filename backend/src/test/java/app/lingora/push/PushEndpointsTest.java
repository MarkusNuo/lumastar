package app.lingora.push;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PushEndpointsTest {

    private static final PushEndpoints PUSH_SERVICES = new PushEndpoints(
            List.of("fcm.googleapis.com", "push.services.mozilla.com", " Push.Apple.com ", "notify.windows.com", ""), true);

    @ParameterizedTest
    @ValueSource(strings = {
            "https://fcm.googleapis.com/fcm/send/dPy3:APA91b",
            "https://updates.push.services.mozilla.com/wpush/v2/gAAAAA",
            "https://web.push.apple.com/QGuQyavXutnMH",
            "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA",
            "https://FCM.googleapis.com/fcm/send/x"})
    void acceptsTheEndpointsOfThePushServices(String endpoint) {
        assertThat(PUSH_SERVICES.isAllowed(endpoint)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://fcm.googleapis.com/fcm/send/x",
            "https://fcm.googleapis.com.attacker.example/x",
            "https://evilfcm.googleapis.com.example/x",
            "https://notfcm.googleapis.com.evil/x",
            "https://user@fcm.googleapis.com/x",
            "https://localhost:8080/api/settings",
            "https://192.168.1.10/admin",
            "ftp://fcm.googleapis.com/x",
            "fcm.googleapis.com/fcm/send/x",
            "https://fcm.googleapis.com:443/fcm send",
            "https://"})
    void refusesAnyOtherUrl(String endpoint) {
        assertThat(PUSH_SERVICES.isAllowed(endpoint)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://127.0.0.1:8181/push/1", "https://127.0.0.1/push/2"})
    void acceptsALocalStubOnlyWhereConfigured(String endpoint) {
        assertThat(new PushEndpoints(List.of("127.0.0.1"), false).isAllowed(endpoint)).isTrue();
        assertThat(new PushEndpoints(List.of("127.0.0.1"), true).isAllowed(endpoint)).isEqualTo(endpoint.startsWith("https"));
        assertThat(PUSH_SERVICES.isAllowed(endpoint)).isFalse();
    }
}
