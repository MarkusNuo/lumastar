package app.lingora.push;

import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "daily reminder of the goal, streak rescue in the evening, or the test notification of the settings")
public enum NotificationKind {
    DAILY_REMINDER("daily_reminder", "lingora-daily-reminder"),
    STREAK_AT_RISK("streak_at_risk", "lingora-streak-at-risk"),
    TEST("test", "lingora-test");

    private final String code;
    private final String tag;

    NotificationKind(String code, String tag) {
        this.code = code;
        this.tag = tag;
    }

    @JsonValue
    public String code() {
        return code;
    }

    /** The notification tag, stable per kind, so that a new notification replaces the previous one of its kind. */
    String tag() {
        return tag;
    }
}
