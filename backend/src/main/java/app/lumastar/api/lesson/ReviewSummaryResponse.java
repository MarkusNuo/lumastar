package app.lumastar.api.lesson;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The learner's FSRS cards: what is due now and tomorrow. Only cards that a lesson exercise "
        + "can practise count, so a review lesson can be started exactly while dueNow is above 0")
public record ReviewSummaryResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Cards due now, overdue ones included")
        int dueNow,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Cards that come due during tomorrow, in the learner's time zone") int dueTomorrow,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "All cards, i.e. items practised so far")
        int totalCards) {
}
