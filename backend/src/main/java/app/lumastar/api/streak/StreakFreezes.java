package app.lumastar.api.streak;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;

@Schema(description = "The streak freezes: every ISO week has one, which bridges a single missed day and is not carried "
        + "over to the next week")
public record StreakFreezes(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Freezes left this ISO week, 0 or 1; a freeze "
                + "bridging yesterday is deducted already") int available,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "1") int perWeek,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The next Monday, when the new week's freeze "
                + "is available") LocalDate resetsOn,
        @Schema(description = "The last day a freeze bridged, yesterday included while it bridges it; absent before the "
                + "first time") LocalDate lastUsedOn) {
}
