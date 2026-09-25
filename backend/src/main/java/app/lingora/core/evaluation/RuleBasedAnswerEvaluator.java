package app.lingora.core.evaluation;

import app.lingora.core.evaluation.TextAnswerCheck.Expected;
import app.lingora.domain.Answer;
import app.lingora.domain.ErrorCategory;
import app.lingora.domain.EvaluationResult;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload.FillGap;
import app.lingora.domain.ExercisePayload.MatchPairs;
import app.lingora.domain.ExercisePayload.MultipleChoice;
import app.lingora.domain.ExercisePayload.TranslateFree;
import app.lingora.domain.ExercisePayload.TranslateWordbank;
import app.lingora.domain.ExercisePayload.WordOrder;
import java.util.List;

/**
 * Phase 1 evaluator with Gheg tolerance (PRD F5, F6, chapter 4). Choice exercises compare the picked option, text
 * exercises go through the tolerant {@link TextAnswerCheck}, match_pairs uses the number of wrong matches.
 */
public final class RuleBasedAnswerEvaluator implements AnswerEvaluator {

    private final TextAnswerCheck textCheck;

    public RuleBasedAnswerEvaluator(StandardFormLexicon lexicon) {
        this.textCheck = new TextAnswerCheck(lexicon);
    }

    @Override
    public EvaluationResult evaluate(Exercise exercise, Answer answer) {
        return switch (exercise.payload()) {
            case MultipleChoice choice -> ChoiceAnswerCheck.evaluate(exercise, choice.solutions(), chosen(exercise, answer));
            case FillGap gap when !gap.choices().isEmpty() ->
                    ChoiceAnswerCheck.evaluate(exercise, gap.solutions(), chosen(exercise, answer));
            case FillGap gap -> textCheck.evaluate(exercise,
                    new Expected(gap.answerLang(), gap.solutions(), gap.standardForms()), typed(exercise, answer));
            case TranslateFree free -> textCheck.evaluate(exercise,
                    new Expected(free.answerLang(), free.solutions(), free.standardForms()), typed(exercise, answer));
            case TranslateWordbank bank -> textCheck.evaluate(exercise,
                    new Expected(bank.answerLang(), bank.solutions(), List.of()), assembled(exercise, answer));
            case WordOrder order -> textCheck.evaluate(exercise,
                    new Expected(order.answerLang(), order.solutions(), List.of()), assembled(exercise, answer));
            case MatchPairs _ -> matchedPairs(exercise, mistakes(exercise, answer));
        };
    }

    private static EvaluationResult matchedPairs(Exercise exercise, int mistakes) {
        return switch (mistakes) {
            case 0 -> Results.correct(exercise, null);
            case 1 -> Results.almostCorrect(exercise, ErrorCategory.VOCAB_CONFUSED, null, FeedbackHints.onePairMismatched());
            default -> Results.wrong(exercise, ErrorCategory.VOCAB_CONFUSED, null, FeedbackHints.pairsMismatched(mistakes));
        };
    }

    private static String chosen(Exercise exercise, Answer answer) {
        if (answer instanceof Answer.Choice choice) {
            return choice.value();
        }
        throw new UnsupportedAnswerException(exercise, "choice", answer);
    }

    private static String typed(Exercise exercise, Answer answer) {
        if (answer instanceof Answer.Text text) {
            return text.value();
        }
        throw new UnsupportedAnswerException(exercise, "text", answer);
    }

    /** The word chips joined into the sentence they form. */
    private static String assembled(Exercise exercise, Answer answer) {
        if (answer instanceof Answer.Tokens tokens) {
            return String.join(" ", tokens.tokens());
        }
        throw new UnsupportedAnswerException(exercise, "tokens", answer);
    }

    private static int mistakes(Exercise exercise, Answer answer) {
        if (answer instanceof Answer.PairMistakes pairs) {
            return pairs.mistakes();
        }
        throw new UnsupportedAnswerException(exercise, "mistakes", answer);
    }
}
