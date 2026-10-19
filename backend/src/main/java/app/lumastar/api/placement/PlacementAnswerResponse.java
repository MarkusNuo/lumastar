package app.lumastar.api.placement;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The test goes on with the next item or is finished; like a real placement test it gives no "
        + "verdict on single answers")
public record PlacementAnswerResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "true when the test is over; the result is at GET /api/placement/{testId}/result")
        boolean finished,
        @Schema(description = "The item to show next; absent when finished") PlacementItem nextItem,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "1-based position of the next item; when finished, the number of answered items") int position) {
}
