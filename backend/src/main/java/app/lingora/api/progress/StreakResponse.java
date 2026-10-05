package app.lingora.api.progress;

import app.lingora.core.progress.StreakRule;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "The streak (PRD F9): days in a row with the daily goal met. A single missed day is bridged by the "
        + "streak freeze of its ISO week (1 per week, not carried over); two missed days in a row end the streak.")
public record StreakResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "0 once the streak has ended") int current,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int longest,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Streak freezes left this ISO week, 0 or 1")
        int freezesLeft,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Today's goal is met and has extended the streak")
        boolean extendedToday,
        @Schema(description = "The last day the daily goal was met; absent before the first time") LocalDate lastActiveDate,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Yesterday was missed and the streak freeze "
                + "bridges it; until today's goal is met, missing today as well ends the streak and keeps the freeze")
        boolean freezeUsedYesterday) {

    static StreakResponse of(StreakRule.Status status, boolean freezeUsedYesterday) {
        return new StreakResponse(status.current(), status.longest(), status.freezesLeft(), status.extendedToday(),
                status.lastActiveDate(), freezeUsedYesterday);
    }
}
