package app.lingora.api.progress;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The streak after the lesson (PRD F9)")
public record LessonStreak(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int current,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Today's goal is met and has extended the streak")
        boolean extendedToday,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "This lesson extended the streak over the "
                + "missed day before, which the weekly streak freeze bridged") boolean freezeUsed) {
}
