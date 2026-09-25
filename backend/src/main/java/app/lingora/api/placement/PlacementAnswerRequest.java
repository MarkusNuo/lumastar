package app.lingora.api.placement;

import app.lingora.api.lesson.SubmittedAnswer;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Duration;

public record PlacementAnswerRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Id of the item shown")
        @NotBlank @Size(max = 100) String exerciseId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull @Valid SubmittedAnswer answer,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Time from showing the item to the answer")
        @NotNull @PositiveOrZero @Max(MAX_RESPONSE_MS) Integer responseTimeMs) {

    static final int MAX_RESPONSE_MS = 24 * 60 * 60 * 1000;

    Duration responseTime() {
        return Duration.ofMillis(responseTimeMs);
    }
}
