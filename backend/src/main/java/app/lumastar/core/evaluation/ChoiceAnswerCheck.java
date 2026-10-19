package app.lumastar.core.evaluation;

import app.lumastar.domain.AnswerNormalizer;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Exercise;
import java.util.List;

/** Check of a picked option (multiple_choice, fill_gap with choices): only an accepted solution is correct. */
final class ChoiceAnswerCheck {

    private ChoiceAnswerCheck() {
    }

    static EvaluationResult evaluate(Exercise exercise, List<String> solutions, String choice) {
        String chosen = AnswerNormalizer.normalize(choice);
        return solutions.stream()
                .filter(solution -> AnswerNormalizer.normalize(solution).equals(chosen))
                .findFirst()
                .map(solution -> Results.correct(exercise, solution))
                .orElseGet(() -> wrong(exercise, solutions.getFirst(), chosen));
    }

    private static EvaluationResult wrong(Exercise exercise, String solution, String chosen) {
        return WrongAnswers.matchingHint(exercise, chosen)
                .map(hint -> Results.wrong(exercise, hint.category(), solution, hint.hint()))
                .orElseGet(() -> Results.wrong(exercise,
                        WrongAnswers.categoryFromSkillTags(exercise, ErrorCategory.VOCAB_CONFUSED), solution, null));
    }
}
