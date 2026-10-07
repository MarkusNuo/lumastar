package app.lingora.api.push;

import static app.lingora.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.PlacementDriver;
import app.lingora.PushSubscriptions;
import app.lingora.RecordingPushSender.SentPush;
import app.lingora.SpaClient;
import app.lingora.push.PushOutcome;
import app.lingora.push.PushSetup;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** The learner's devices for web push and the test notification; push messages go to the recording sender. */
class PushApiTest extends IntegrationTest {

    private static final String PHONE = "https://fcm.googleapis.com/fcm/send/phone:APA91b";
    private static final String LAPTOP = "https://updates.push.services.mozilla.com/wpush/v2/laptop";

    @Autowired
    private PushSetup setup;

    private SpaClient learner;

    @BeforeEach
    void signedInLearner() {
        jdbc.sql("DELETE FROM users").update();
        learner = new SpaClient(mvc);
        learner.register("Erza");
    }

    @Test
    void reportsTheKeyToSubscribeWith() {
        assertThat(learner.get("/api/push/config")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"available": true, "publicKey": "%s"}""".formatted(setup.publicKey().orElseThrow()));
    }

    @Test
    void registersADeviceOnceAndUpdatesItWhenItSubscribesAgain() {
        MvcTestResult first = learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE, "Chrome auf Android"));
        MvcTestResult again = learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE, "  Mein Handy  "));

        assertThat(first).hasStatusOk().bodyJson().extractingPath("$.label").isEqualTo("Chrome auf Android");
        assertThat(again).hasStatusOk().bodyJson().extractingPath("$.label").isEqualTo("Mein Handy");
        assertThat(again).bodyJson().extractingPath("$.createdAt")
                .isEqualTo(PlacementDriver.body(first).get("createdAt").asString());
        assertThat(learner.get("/api/push/subscriptions")).bodyJson().extractingPath("$[*].endpoint").isEqualTo(List.of(PHONE));
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(LAPTOP))).hasStatusOk()
                .bodyJson().doesNotHavePath("$.label");
        assertThat(learner.get("/api/push/subscriptions")).bodyJson().extractingPath("$[*].endpoint")
                .isEqualTo(List.of(PHONE, LAPTOP));
    }

    @Test
    void removesADeviceOfTheLearnerOnly() {
        SpaClient other = new SpaClient(mvc);
        other.register("Bora");
        assertThat(other.post("/api/push/subscriptions", PushSubscriptions.json(LAPTOP))).hasStatusOk();
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE))).hasStatusOk();

        assertThat(learner.delete("/api/push/subscriptions", """
                {"endpoint": "%s"}""".formatted(LAPTOP))).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(learner.delete("/api/push/subscriptions", """
                {"endpoint": "%s"}""".formatted(PHONE))).hasStatus(HttpStatus.NO_CONTENT);
        assertThat(learner.delete("/api/push/subscriptions", """
                {"endpoint": "%s"}""".formatted(PHONE))).as("idempotent").hasStatus(HttpStatus.NO_CONTENT);

        assertThat(learner.get("/api/push/subscriptions")).bodyJson().isStrictlyEqualTo("[]");
        assertThat(other.get("/api/push/subscriptions")).bodyJson().extractingPath("$[*].endpoint").isEqualTo(List.of(LAPTOP));
    }

    @Test
    void aDeviceMovesToTheAccountThatSignedInOnIt() {
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE))).hasStatusOk();
        SpaClient other = new SpaClient(mvc);
        other.register("Bora");

        assertThat(other.post("/api/push/subscriptions", PushSubscriptions.json(PHONE))).hasStatusOk();

        assertThat(learner.get("/api/push/subscriptions")).bodyJson().isStrictlyEqualTo("[]");
        assertThat(other.get("/api/push/subscriptions")).bodyJson().extractingPath("$[*].endpoint").isEqualTo(List.of(PHONE));
    }

    @Test
    void refusesKeysThatNoBrowserMakes() {
        MvcTestResult rejected = learner.post("/api/push/subscriptions", """
                {"endpoint": "%s", "keys": {"p256dh": "B%s", "auth": "short"}}""".formatted(PHONE, "A".repeat(86)));

        assertThat(rejected).hasStatus(HttpStatus.BAD_REQUEST).bodyJson().extractingPath("$.errors[*].field")
                .isEqualTo(List.of("keys.authValid", "keys.p256dhValid"));
        assertThat(learner.post("/api/push/subscriptions", "{}")).hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[*].field").isEqualTo(List.of("endpoint", "keys"));
    }

    @Test
    void refusesEndpointsOutsideTheKnownPushServices() {
        for (String endpoint : List.of("https://localhost:8080/api/account", "http://fcm.googleapis.com/fcm/send/x",
                "https://192.168.1.20/push", "https://fcm.googleapis.com.example/x")) {
            assertProblem(learner.post("/api/push/subscriptions", PushSubscriptions.json(endpoint)), HttpStatus.BAD_REQUEST,
                    "push_service_not_supported");
        }
        assertThat(jdbc.sql("SELECT count(*) FROM push_subscriptions").query(Integer.class).single()).isZero();
    }

    @Test
    void sendsATestNotificationToEveryDevice() {
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE))).hasStatusOk();
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(LAPTOP))).hasStatusOk();

        MvcTestResult sent = learner.post("/api/push/test", "");

        assertThat(sent).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"devices": 2, "delivered": 2, "removed": 0,
                 "notification": {"kind": "test", "title": "Erinnerungen sind bereit 🔔",
                                  "body": "So erinnert dich Lingora an dein Tagesziel.", "url": "/",
                                  "tag": "lingora-test", "renotify": true, "icon": "/icons/icon-192.png",
                                  "badge": "/icons/badge-96.png", "actions": []}}""");
        assertThat(pushes.sent()).extracting(SentPush::endpoint).containsExactly(PHONE, LAPTOP);
        assertThat(pushes.sent()).extracting(SentPush::timeToLive).containsOnly(Duration.ofMinutes(10));
        assertThat(learner.get("/api/push/subscriptions")).bodyJson().extractingPath("$[*].lastSuccessAt").asArray()
                .hasSize(2).doesNotContainNull();
    }

    @Test
    void removesDevicesThePushServiceNoLongerKnowsAndCountsOtherFailures() {
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE))).hasStatusOk();
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(LAPTOP))).hasStatusOk();
        pushes.answer(PHONE, PushOutcome.GONE);
        pushes.answer(LAPTOP, PushOutcome.FAILED);

        assertThat(learner.post("/api/push/test", "")).hasStatusOk().bodyJson().extractingPath("$.removed").isEqualTo(1);
        assertThat(learner.post("/api/push/test", "")).hasStatusOk().bodyJson().extractingPath("$.devices").isEqualTo(1);

        MvcTestResult devices = learner.get("/api/push/subscriptions");
        assertThat(devices).bodyJson().isStrictlyEqualTo("""
                [{"endpoint": "%s", "createdAt": "%s", "failureCount": 2}]""".formatted(LAPTOP,
                PlacementDriver.body(devices).get(0).get("createdAt").asString()));
        pushes.answer(LAPTOP, PushOutcome.DELIVERED);
        assertThat(learner.post("/api/push/test", "")).hasStatusOk();
        assertThat(learner.get("/api/push/subscriptions")).bodyJson().extractingPath("$[0].failureCount").isEqualTo(0);
    }

    @Test
    void aTestNeedsADeviceAndIsLimited() {
        assertProblem(learner.post("/api/push/test", ""), HttpStatus.CONFLICT, "no_push_devices");
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE))).hasStatusOk();

        for (int test = 0; test < 10; test++) {
            assertThat(learner.post("/api/push/test", "")).hasStatusOk();
        }

        assertProblem(learner.post("/api/push/test", ""), HttpStatus.TOO_MANY_REQUESTS, "too_many_requests");
        assertThat(pushes.sent()).hasSize(10);
    }

    @Test
    void requiresASignedInLearnerAndTheCsrfToken() {
        SpaClient anonymous = new SpaClient(mvc);
        assertThat(anonymous.get("/api/push/config")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(anonymous.get("/api/push/subscriptions")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(learner.postWithoutCsrfHeader("/api/push/subscriptions", PushSubscriptions.json(PHONE)))
                .hasStatus(HttpStatus.FORBIDDEN);
        assertThat(learner.postWithoutCsrfHeader("/api/push/test", "")).hasStatus(HttpStatus.FORBIDDEN);
        assertThat(jdbc.sql("SELECT count(*) FROM push_subscriptions").query(Integer.class).single()).isZero();
    }

    @Test
    void devicesAreDeletedWithTheAccount() {
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE))).hasStatusOk();

        assertThat(learner.delete("/api/account", """
                {"password": "%s"}""".formatted(SpaClient.PASSWORD))).hasStatus(HttpStatus.NO_CONTENT);

        assertThat(jdbc.sql("SELECT count(*) FROM push_subscriptions").query(Integer.class).single()).isZero();
    }
}
