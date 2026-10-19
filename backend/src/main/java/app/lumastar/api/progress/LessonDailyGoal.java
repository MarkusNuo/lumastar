package app.lumastar.api.progress;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The daily goal on the day of the lesson or placement test, up to and including it")
public record LessonDailyGoal(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int minutesToday,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int goalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean goalMet,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "This lesson or placement test met the goal of "
                + "its day and so extended the streak; time to celebrate") boolean justMet) {
}
