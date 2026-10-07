package app.lingora.push;

import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "A button of the notification (showNotification option actions)")
public record NotificationAction(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Type action,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Jetzt üben") String title) {

    @Schema(name = "NotificationActionType", description = "practise opens the app's next lesson (/weiter) instead of "
            + "url; snooze posts the snoozeToken to POST /api/reminders/snooze, without opening the app")
    public enum Type {
        PRACTISE("practise"),
        SNOOZE("snooze");

        private final String code;

        Type(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }
}
