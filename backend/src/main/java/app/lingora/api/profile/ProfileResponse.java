package app.lingora.api.profile;

import app.lingora.domain.Level;
import app.lingora.persistence.UserEntity;
import io.swagger.v3.oas.annotations.media.Schema;

public record ProfileResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String displayName,
        @Schema(description = "Absent until the placement test (or its skip) has set a level") Level currentLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int xpTotal,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "5, 10, 15 or 20") int dailyGoalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean onboardingCompleted) {

    public static ProfileResponse of(UserEntity user) {
        return new ProfileResponse(user.getDisplayName(), user.getCurrentLevel(), user.getXpTotal(),
                user.getDailyGoalMinutes(), user.isOnboardingCompleted());
    }
}
