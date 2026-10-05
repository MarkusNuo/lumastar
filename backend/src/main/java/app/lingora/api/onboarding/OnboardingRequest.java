package app.lingora.api.onboarding;

import app.lingora.core.progress.DailyGoal;
import app.lingora.domain.Motivation;
import app.lingora.domain.SelfAssessment;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.HashSet;
import java.util.List;

@Schema(description = "The onboarding questions (PRD F1); the options and their German labels come from "
        + "GET /api/onboarding/options.")
public record OnboardingRequest(
        @ArraySchema(schema = @Schema(implementation = Motivation.class), minItems = 1, maxItems = 5, uniqueItems = true,
                arraySchema = @Schema(requiredMode = Schema.RequiredMode.REQUIRED))
        @NotNull @Size(min = 1, max = 5) List<@NotNull Motivation> motivations,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "5, 10, 15 or 20")
        @NotNull Integer dailyGoalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull SelfAssessment selfAssessment) {

    @JsonIgnore
    @AssertTrue(message = "must be one of 5, 10, 15 or 20")
    public boolean isDailyGoalMinutesAllowed() {
        return dailyGoalMinutes == null || DailyGoal.OPTIONS.contains(dailyGoalMinutes);
    }

    @JsonIgnore
    @AssertTrue(message = "must not contain a motivation twice")
    public boolean isMotivationsDistinct() {
        return motivations == null || new HashSet<>(motivations).size() == motivations.size();
    }
}
