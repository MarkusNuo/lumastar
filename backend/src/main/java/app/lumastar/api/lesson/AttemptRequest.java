package app.lumastar.api.lesson;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Duration;

public record AttemptRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotBlank @Size(max = 100) String exerciseId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull @Valid SubmittedAnswer answer,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Time from showing the exercise to the answer")
        @NotNull @PositiveOrZero @Max(MAX_RESPONSE_MS) Integer responseTimeMs,
        @Schema(description = "true for a wrong exercise repeated at the end of the lesson", defaultValue = "false")
        Boolean retry) {

    static final int MAX_RESPONSE_MS = 24 * 60 * 60 * 1000;

    boolean isRetry() {
        return Boolean.TRUE.equals(retry);
    }

    Duration responseTime() {
        return Duration.ofMillis(responseTimeMs);
    }
}
