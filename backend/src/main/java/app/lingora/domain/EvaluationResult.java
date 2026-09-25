package app.lingora.domain;

import java.util.Objects;

/**
 * Binding evaluation of an answer. {@code errorCategory} is {@code null} for a correct answer; {@code hint} and
 * {@code explanation} are German texts for the feedback sheet and may be {@code null}.
 */
public record EvaluationResult(Outcome outcome, ErrorCategory errorCategory, String hint, String explanation, Rating rating) {

    public EvaluationResult {
        Objects.requireNonNull(outcome, "outcome");
        Objects.requireNonNull(rating, "rating");
        Require.that(outcome != Outcome.CORRECT || errorCategory == null, "a correct answer has no error category");
        Require.that(outcome != Outcome.CORRECT_STANDARD_FORM || errorCategory == ErrorCategory.VARIANT_STANDARD_FORM,
                "a standard form is tagged %s", ErrorCategory.VARIANT_STANDARD_FORM.code());
        Require.that((outcome == Outcome.WRONG) == (rating == Rating.AGAIN), "exactly the wrong answers are rated again");
    }
}
