package app.lumastar.api.settings;

import app.lumastar.core.progress.DailyGoal;
import app.lumastar.core.srs.SrsSettings;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.ZoneId;

@Schema(description = "All settings at once; a changed daily goal recalculates the plan's time estimates")
public record SettingsRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "5, 10, 15 or 20")
        @NotNull Integer dailyGoalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0.7", maximum = "0.99", example = "0.9",
                description = "Target retention of the FSRS reviews (PRD F8)")
        @NotNull Double requestRetention,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Europe/Zurich", description = "IANA time zone")
        @NotBlank @Size(max = 64) String timeZone) {

    @JsonIgnore
    @AssertTrue(message = "must be one of 5, 10, 15 or 20")
    public boolean isDailyGoalMinutesAllowed() {
        return dailyGoalMinutes == null || DailyGoal.OPTIONS.contains(dailyGoalMinutes);
    }

    @JsonIgnore
    @AssertTrue(message = "must be between 0.70 and 0.99")
    public boolean isRequestRetentionAllowed() {
        return requestRetention == null || SrsSettings.isValidRetention(requestRetention);
    }

    @JsonIgnore
    @AssertTrue(message = "must be an IANA time zone such as Europe/Zurich")
    public boolean isTimeZoneKnown() {
        return timeZone == null || ZoneId.getAvailableZoneIds().contains(timeZone);
    }
}
