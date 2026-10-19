package app.lumastar.api.lesson;

import app.lumastar.domain.Level;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record StartCheckpointRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The stage whose checkpoint to take, as listed "
                + "by GET /api/path") @NotNull Level level) {
}
