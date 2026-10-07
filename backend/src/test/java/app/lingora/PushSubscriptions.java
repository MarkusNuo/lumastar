package app.lingora;

import app.lingora.push.TestUserAgent;

/** Request bodies of POST /api/push/subscriptions with valid keys, as a browser sends them. */
public final class PushSubscriptions {

    public static final TestUserAgent BROWSER = TestUserAgent.generate();

    private PushSubscriptions() {
    }

    public static String json(String endpoint) {
        return """
                {"endpoint": "%s", "expirationTime": null, "keys": {"p256dh": "%s", "auth": "%s"}}"""
                .formatted(endpoint, BROWSER.p256dh(), BROWSER.auth());
    }

    public static String json(String endpoint, String label) {
        return """
                {"endpoint": "%s", "keys": {"p256dh": "%s", "auth": "%s"}, "label": "%s"}"""
                .formatted(endpoint, BROWSER.p256dh(), BROWSER.auth(), label);
    }
}
