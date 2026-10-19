package app.lumastar.api.settings;

import app.lumastar.persistence.UserEntity;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The learner's settings; sounds and vibration are per-device preferences of the app")
public record SettingsResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "5, 10, 15 or 20") int dailyGoalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0.7", maximum = "0.99", example = "0.9",
                description = "Target retention of the FSRS reviews (PRD F8)") double requestRetention,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Europe/Zurich",
                description = "IANA time zone; it decides when a day starts for the daily goal and the streak")
        String timeZone) {

    static SettingsResponse of(UserEntity learner) {
        return new SettingsResponse(learner.getDailyGoalMinutes(), learner.getRequestRetention(),
                learner.getTimeZone().getId());
    }
}
