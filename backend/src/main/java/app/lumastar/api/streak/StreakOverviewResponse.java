package app.lumastar.api.streak;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "The streak screen: the streak, today's daily goal, the streak freezes, one month of the streak "
        + "calendar and the streak goal; days are dates in the learner's time zone")
public record StreakOverviewResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "0 once the streak has ended") int current,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int longest,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Today's goal is met and has extended the streak")
        boolean extendedToday,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Today in the learner's time zone") LocalDate today,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Whole minutes practised today") int minutesToday,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The daily goal: 5, 10, 15 or 20") int goalMinutes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) StreakFreezes freezes,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) StreakCalendar calendar,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) StreakGoalResponse goal) {
}
