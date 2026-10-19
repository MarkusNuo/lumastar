package app.lumastar.api.streak;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "One month of the streak calendar")
public record StreakCalendar(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "2026-10", pattern = "^\\d{4}-\\d{2}$") String month,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The first day of the month", example = "2026-10-01")
        LocalDate firstDay,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Only the days of the month that counted for the "
                + "streak, in date order; empty for months before the first streak day and for months to come")
        List<StreakCalendarDay> days) {

    public record StreakCalendarDay(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate date,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) StreakDayStatus status) {
    }
}
