package app.lingora.api.profile;

import app.lingora.domain.Level;
import app.lingora.domain.Motivation;
import app.lingora.domain.OnboardingStep;
import app.lingora.domain.SelfAssessment;
import app.lingora.persistence.UserEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public record ProfileResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String displayName,
        @Schema(description = "Absent until the placement test (or its skip) has set a level") Level currentLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int xpTotal,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "5, 10, 15 or 20") int dailyGoalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean onboardingCompleted,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "profile: the onboarding questions are "
                + "open (PUT /api/onboarding); placement: the placement test or its skip is open; done: onboarding done")
        OnboardingStep onboardingStep,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Empty until the onboarding questions are answered")
        List<Motivation> motivations,
        @Schema(description = "Absent until the onboarding questions are answered") SelfAssessment selfAssessment,
        @Schema(description = "Sign-in address; absent while emailRequired") String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean emailVerified,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The account from before multi-user support "
                + "has no e-mail address yet; the app asks for one (PUT /api/account/email) before anything else")
        boolean emailRequired) {

    public static ProfileResponse of(UserEntity user) {
        return new ProfileResponse(user.getDisplayName(), user.getCurrentLevel(), user.getXpTotal(),
                user.getDailyGoalMinutes(), user.isOnboardingCompleted(), user.onboardingStep(),
                user.getMotivations().stream().sorted().toList(), user.getSelfAssessment(), user.getEmail(),
                user.isEmailVerified(), user.isEmailRequired());
    }
}
