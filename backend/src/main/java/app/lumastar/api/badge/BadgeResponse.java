package app.lumastar.api.badge;

import app.lumastar.domain.LevelBadge;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "A level badge (PRD F9), earned by the checkpoint that completes a CEFR band")
public record BadgeResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LevelBadge code,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant awardedAt) {
}
