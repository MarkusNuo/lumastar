package app.lingora.push;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.Signature;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Real web push against a stub push service on the loopback address, decrypted as a browser would. */
class WebPushSenderTest {

    private static final Pattern VAPID = Pattern.compile("vapid t=([\\w-]+)\\.([\\w-]+)\\.([\\w-]+), k=([\\w-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Instant NOW = Instant.parse("2026-10-07T17:00:00Z");

    /** A request as the stub push service received it. */
    private record Received(String path, Map<String, List<String>> headers, byte[] body) {

        String header(String name) {
            return headers.entrySet().stream().filter(entry -> entry.getKey().equalsIgnoreCase(name))
                    .map(entry -> entry.getValue().getFirst()).findFirst().orElse(null);
        }
    }

    private final List<Received> received = new CopyOnWriteArrayList<>();
    private final AtomicInteger status = new AtomicInteger(201);
    private final VapidKeys keys = VapidKeys.generate();
    private final TestUserAgent browser = TestUserAgent.generate();
    private HttpServer pushService;
    private WebPushSender sender;

    @BeforeEach
    void startStubPushService() throws IOException {
        pushService = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        pushService.createContext("/push/", exchange -> {
            received.add(new Received(exchange.getRequestURI().getPath(), Map.copyOf(exchange.getRequestHeaders()),
                    exchange.getRequestBody().readAllBytes()));
            exchange.sendResponseHeaders(status.get(), -1);
            exchange.close();
        });
        pushService.start();
        sender = new WebPushSender(PushSetup.of(keys, "mailto:lingora@example.org"), JSON,
                Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofSeconds(5));
    }

    @AfterEach
    void stopStubPushService() {
        sender.close();
        pushService.stop(0);
    }

    @Test
    void sendsTheNotificationEncryptedForTheSubscriptionWithVapid() throws GeneralSecurityException {
        PushNotification notification = PushNotification.of(NotificationKind.DAILY_REMINDER, "Zeit für Gheg! 🔥",
                "Dein 12-Tage-Streak wartet auf dich.", "/",
                List.of(new NotificationAction(NotificationAction.Type.PRACTISE, "Jetzt üben"),
                        new NotificationAction(NotificationAction.Type.SNOOZE, "In 1 Stunde")), 3, "snooze-token");

        PushOutcome outcome = sender.send(browser.subscription(endpoint("/push/device-1")), notification,
                Duration.ofHours(5));

        assertThat(outcome).isEqualTo(PushOutcome.DELIVERED);
        assertThat(received).hasSize(1);
        Received request = received.getFirst();
        assertThat(request.path()).isEqualTo("/push/device-1");
        assertThat(request.header("Content-Encoding")).isEqualTo("aes128gcm");
        assertThat(request.header("Content-Type")).isEqualTo("application/octet-stream");
        assertThat(request.header("TTL")).isEqualTo("18000");
        assertThat(request.header("Urgency")).isEqualTo("normal");
        assertThat(request.header("Topic")).isEqualTo("lingora-daily-reminder");
        assertThat(JSON.readTree(browser.decrypt(request.body()))).isEqualTo(JSON.readTree("""
                {"kind": "daily_reminder", "title": "Zeit für Gheg! 🔥", "body": "Dein 12-Tage-Streak wartet auf dich.",
                 "url": "/", "tag": "lingora-daily-reminder", "renotify": true, "icon": "/icons/icon-192.png",
                 "badge": "/icons/badge-96.png",
                 "actions": [{"action": "practise", "title": "Jetzt üben"}, {"action": "snooze", "title": "In 1 Stunde"}],
                 "badgeCount": 3, "snoozeToken": "snooze-token"}"""));

        Matcher vapid = VAPID.matcher(request.header("Authorization"));
        assertThat(vapid.matches()).isTrue();
        assertThat(vapid.group(4)).isEqualTo(keys.encodedPublicKey());
        JsonNode claims = JSON.readTree(Base64Url.decode(vapid.group(2)));
        assertThat(claims.get("aud").asString()).isEqualTo(endpoint(""));
        assertThat(claims.get("sub").asString()).isEqualTo("mailto:lingora@example.org");
        assertThat(claims.get("exp").asLong()).isEqualTo(NOW.plus(Duration.ofHours(12)).getEpochSecond());
        Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
        verifier.initVerify(keys.publicKey());
        verifier.update((vapid.group(1) + "." + vapid.group(2)).getBytes(StandardCharsets.US_ASCII));
        assertThat(verifier.verify(Base64Url.decode(vapid.group(3)))).isTrue();
    }

    @Test
    void leavesOutWhatTheNotificationDoesNotHave() {
        PushNotification test = PushNotification.of(NotificationKind.TEST, "Erinnerungen sind bereit 🔔",
                "So erinnert dich Lingora an dein Tagesziel.", "/", List.of(), null, null);

        sender.send(browser.subscription(endpoint("/push/device-1")), test, Duration.ofMinutes(10));

        JsonNode payload = JSON.readTree(browser.decrypt(received.getFirst().body()));
        assertThat(payload.has("badgeCount")).isFalse();
        assertThat(payload.has("snoozeToken")).isFalse();
        assertThat(payload.get("actions").isEmpty()).isTrue();
        assertThat(received.getFirst().header("TTL")).isEqualTo("600");
    }

    @ParameterizedTest
    @CsvSource({"200, DELIVERED", "201, DELIVERED", "202, DELIVERED", "404, GONE", "410, GONE", "400, FAILED",
            "403, FAILED", "413, FAILED", "429, FAILED", "500, FAILED", "503, FAILED"})
    void tellsWhatThePushServiceAnswered(int answer, PushOutcome outcome) {
        status.set(answer);

        assertThat(sender.send(browser.subscription(endpoint("/push/device-2")), notification(), Duration.ofHours(1)))
                .isEqualTo(outcome);
    }

    @Test
    void failsWhenThePushServiceIsUnreachable() {
        String endpoint = endpoint("/push/device-3");
        pushService.stop(0);

        assertThat(sender.send(browser.subscription(endpoint), notification(), Duration.ofHours(1)))
                .isEqualTo(PushOutcome.FAILED);
    }

    private String endpoint(String path) {
        return "http://127.0.0.1:%d%s".formatted(pushService.getAddress().getPort(), path);
    }

    private static PushNotification notification() {
        return PushNotification.of(NotificationKind.STREAK_AT_RISK, "Dein Streak ist in Gefahr! 🔥",
                "Mit 10 Minuten Gheg rettest du ihn noch heute.", "/", List.of(), 1, null);
    }
}
