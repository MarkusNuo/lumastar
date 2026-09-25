package app.lingora.domain;

import java.util.Objects;

/**
 * Binding evaluation of an answer. {@code errorCategory} is {@code null} exactly for a correct answer. {@code hint}
 * (German, may contain {@code **bold**} words) and {@code solution} (the accepted solution closest to the answer, for
 * display) may be {@code null}; {@code rating} is the FSRS rating derived from the outcome.
 */
public record EvaluationResult(
        Outcome outcome,
        ErrorCategory errorCategory,
        String hint,
        String explanation,
        String solution,
        Rating rating) {

    public EvaluationResult {
        Objects.requireNonNull(outcome, "outcome");
        Objects.requireNonNull(rating, "rating");
        Require.that((outcome == Outcome.CORRECT) == (errorCategory == null),
                "exactly the correct answers have no error category");
        Require.that(outcome != Outcome.CORRECT_STANDARD_FORM || errorCategory == ErrorCategory.VARIANT_STANDARD_FORM,
                "a standard form is tagged %s", ErrorCategory.VARIANT_STANDARD_FORM.code());
        Require.that((outcome == Outcome.WRONG) == (rating == Rating.AGAIN), "exactly the wrong answers are rated again");
    }

    /** Correct, almost correct and standard-form answers count as correct (PRD F5, chapter 4). */
    public boolean countsAsCorrect() {
        return outcome.isAccepted();
    }
}
