package app.lingora.api.lesson;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

@Schema(description = "A started lesson; its exercises are in the order they are played")
public record LessonResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID sessionId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String unitId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<LessonExercise> exercises) {
}
