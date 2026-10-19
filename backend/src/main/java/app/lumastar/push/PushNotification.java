package app.lumastar.push;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Objects;

/**
 * The JSON payload of a push message. The service worker shows it with
 * {@code registration.showNotification(title, {body, tag, renotify, icon, badge, actions, data: {url, snoozeToken}})}
 * and sets the app badge to {@code badgeCount}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Payload of a web push message, shown by the service worker as a system notification")
public record PushNotification(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) NotificationKind kind,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Zeit für Gheg! 🔥") String title,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Dein 12-Tage-Streak wartet auf dich.") String body,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "/",
                description = "Path of the app that a tap on the notification opens; the practise action opens the "
                        + "next lesson (/weiter) instead") String url,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "lumastar-daily-reminder",
                description = "Stable per kind: a new notification replaces the previous one of its kind") String tag,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Alert again when replacing a notification with the same tag") boolean renotify,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = ICON) String icon,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = BADGE,
                description = "Monochrome icon of the status bar (Android)") String badge,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Buttons of the notification; empty for the "
                + "test notification") List<NotificationAction> actions,
        @Schema(description = "For navigator.setAppBadge: the review cards due now, or 1 while only the daily goal is "
                + "open; absent if the badge should stay as it is") Integer badgeCount,
        @Schema(description = "Present with the snooze action: POST it to /api/reminders/snooze to get this reminder "
                + "again in an hour; valid until the end of the learner's day") String snoozeToken) {

    /** The start of the app, the learning path with the next step. */
    public static final String HOME = "/";
    public static final String ICON = "/icons/icon-192.png";
    public static final String BADGE = "/icons/badge-96.png";

    public PushNotification {
        Objects.requireNonNull(kind, "kind");
        actions = List.copyOf(actions);
    }

    /** A notification of the app: its icon and badge, and the tag of its kind, alerting again when it replaces one. */
    public static PushNotification of(NotificationKind kind, String title, String body, String url,
                                      List<NotificationAction> actions, Integer badgeCount, String snoozeToken) {
        return new PushNotification(kind, title, body, url, kind.tag(), true, ICON, BADGE, actions, badgeCount, snoozeToken);
    }
}
