package app.lumastar.api.progress;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "Today's progress towards the daily goal and the streak (PRD F9); days are dates in the learner's "
        + "time zone")
public record DailyProgressResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Today in the learner's time zone") LocalDate date,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Whole minutes practised today: completed "
                + "lessons of every kind and placement tests, each counted with at most 30 minutes") int minutesToday,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "5, 10, 15 or 20") int goalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "minutesToday ≥ goalMinutes") boolean goalMet,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int xpToday,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Lessons of every kind completed today")
        int lessonsToday,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) StreakResponse streak) {
}
