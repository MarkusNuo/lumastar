package app.lumastar.api.onboarding;

import app.lumastar.core.progress.DailyGoal;
import app.lumastar.domain.Level;
import app.lumastar.domain.Motivation;
import app.lumastar.domain.SelfAssessment;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Arrays;
import java.util.List;

@Schema(description = "The answer options of the onboarding questions with their German labels, in display order")
public record OnboardingOptionsResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<MotivationOption> motivations,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<Integer> dailyGoalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "From \"Ich kann kein Wort\" to \"Ich verstehe viel, will aber besser schreiben\"")
        List<SelfAssessmentOption> selfAssessments) {

    public record MotivationOption(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Motivation value,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Familie/Partner") String label) {
    }

    public record SelfAssessmentOption(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) SelfAssessment value,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Ich kann kein Wort") String label,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Level the first placement test starts at")
            Level startLevel,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                    description = "Whether the first placement test may be skipped (start at A0)") boolean placementSkippable) {
    }

    static OnboardingOptionsResponse all() {
        return new OnboardingOptionsResponse(
                Arrays.stream(Motivation.values()).map(value -> new MotivationOption(value, value.label())).toList(),
                DailyGoal.OPTIONS,
                Arrays.stream(SelfAssessment.values())
                        .map(value -> new SelfAssessmentOption(value, value.label(), value.startLevel(),
                                value.allowsSkippingPlacement()))
                        .toList());
    }
}
