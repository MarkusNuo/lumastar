package app.lumastar.core.evaluation;

import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.Rating;

/**
 * Builds evaluation results with the provisional FSRS rating of PRD F8: wrong → Again, almost correct → Hard,
 * otherwise Good. The timing-based Hard and Easy ratings are applied later by a separate rating policy.
 */
final class Results {

    private Results() {
    }

    static EvaluationResult correct(Exercise exercise, String solution) {
        return result(Outcome.CORRECT, null, null, exercise, solution);
    }

    static EvaluationResult standardForm(Exercise exercise, String solution, String hint) {
        return result(Outcome.CORRECT_STANDARD_FORM, ErrorCategory.VARIANT_STANDARD_FORM, hint, exercise, solution);
    }

    static EvaluationResult almostCorrect(Exercise exercise, ErrorCategory category, String solution, String hint) {
        return result(Outcome.ALMOST_CORRECT, category, hint, exercise, solution);
    }

    static EvaluationResult wrong(Exercise exercise, ErrorCategory category, String solution, String hint) {
        return result(Outcome.WRONG, category, hint, exercise, solution);
    }

    private static EvaluationResult result(Outcome outcome, ErrorCategory category, String hint, Exercise exercise,
                                           String solution) {
        return new EvaluationResult(outcome, category, hint, exercise.explanation(), solution, provisionalRating(outcome));
    }

    private static Rating provisionalRating(Outcome outcome) {
        return switch (outcome) {
            case WRONG -> Rating.AGAIN;
            case ALMOST_CORRECT -> Rating.HARD;
            case CORRECT, CORRECT_STANDARD_FORM -> Rating.GOOD;
        };
    }
}
