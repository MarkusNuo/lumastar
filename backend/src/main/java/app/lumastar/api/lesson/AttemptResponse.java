package app.lumastar.api.lesson;

import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.Rating;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Binding evaluation of an answer; it replaces the pre-check of the app if the two differ")
public record AttemptResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String exerciseId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Outcome outcome,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "true for correct, almost correct and standard-form answers") boolean countsAsCorrect,
        @Schema(description = "Absent for a correct answer") ErrorCategory errorCategory,
        @Schema(description = "Short German hint; words to look at are marked as **bold**") String hint,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "German explanation of the exercise") String explanation,
        @Schema(description = "The accepted solution closest to the answer; absent for match_pairs") String solution,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "FSRS rating of the answer: again for "
                + "wrong, hard for almost correct or slow, good for correct, easy for correct and fast on known items. "
                + "The cards of its items are reviewed with it; a retry reviews no card.") Rating rating) {

    static AttemptResponse of(String exerciseId, EvaluationResult result, Rating rating) {
        return new AttemptResponse(exerciseId, result.outcome(), result.countsAsCorrect(), result.errorCategory(),
                result.hint(), result.explanation(), result.solution(), rating);
    }
}
