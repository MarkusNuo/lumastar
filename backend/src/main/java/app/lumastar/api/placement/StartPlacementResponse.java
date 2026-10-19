package app.lumastar.api.placement;

import app.lumastar.domain.Level;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(description = "A started placement test with its first item")
public record StartPlacementResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID testId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level startLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) PlacementItem item,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "1-based position of the item") int position,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "The most items the test can take; it usually ends earlier") int maxItems) {
}
