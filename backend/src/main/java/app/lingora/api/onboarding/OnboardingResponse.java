package app.lingora.api.onboarding;

import app.lingora.domain.Level;
import io.swagger.v3.oas.annotations.media.Schema;

public record OnboardingResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The level POST /api/placement starts at")
        Level startLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "true if POST /api/placement/skip may be used instead of the test (\"Ich kann kein Wort\", "
                        + "before the first placement)")
        boolean placementSkippable) {
}
