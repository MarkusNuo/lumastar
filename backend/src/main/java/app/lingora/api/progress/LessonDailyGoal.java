package app.lingora.api.progress;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The daily goal on the day of the lesson, up to and including the lesson (PRD F9)")
public record LessonDailyGoal(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int minutesToday,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int goalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean goalMet,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "This lesson met the goal of its day and so "
                + "extended the streak; time to celebrate") boolean justMet) {
}
