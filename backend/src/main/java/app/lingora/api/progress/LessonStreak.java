package app.lingora.api.progress;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The streak after the lesson or placement test (PRD F9)")
public record LessonStreak(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int current,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The streak before this lesson or placement "
                + "test: current - 1 if it extended the streak and its day is still the last of the streak, otherwise "
                + "equal to current")
        int previous,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Today's goal is met and has extended the streak")
        boolean extendedToday,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "This lesson or placement test extended the "
                + "streak over the missed day before, which the weekly streak freeze bridged") boolean freezeUsed,
        @Schema(description = "This lesson or placement test extended the streak to its goal; absent otherwise, and once "
                + "the next goal has been chosen") StreakGoalReached goalReached) {
}
