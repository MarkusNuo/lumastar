package app.lumastar.core.evaluation;

import app.lumastar.core.evaluation.TextAnswerCheck.Expected;
import app.lumastar.domain.Answer;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExercisePayload.FillGap;
import app.lumastar.domain.ExercisePayload.MatchPairs;
import app.lumastar.domain.ExercisePayload.MultipleChoice;
import app.lumastar.domain.ExercisePayload.TranslateFree;
import app.lumastar.domain.ExercisePayload.TranslateWordbank;
import app.lumastar.domain.ExercisePayload.WordOrder;
import java.util.List;

/**
 * Phase 1 evaluator with Gheg tolerance (PRD F5, F6, chapter 4). Only typed answers are tolerant
 * ({@link TextAnswerCheck}); picked options, word tiles and matched pairs are exact (docs/CONTENT_FORMAT.md point 7).
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
            case TranslateWordbank bank -> TileAnswerCheck.evaluate(exercise, bank.solutions(), tiles(exercise, answer));
            case WordOrder order -> TileAnswerCheck.evaluate(exercise, order.solutions(), tiles(exercise, answer));
            case MatchPairs pairs -> matched(exercise, pairs, answer);
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

    private static List<String> tiles(Exercise exercise, Answer answer) {
        if (answer instanceof Answer.Tokens tokens) {
            return tokens.tokens();
        }
        throw new UnsupportedAnswerException(exercise, "tokens", answer);
    }

    private static EvaluationResult matched(Exercise exercise, MatchPairs pairs, Answer answer) {
        return switch (answer) {
            case Answer.WrongMatches wrong -> PairAnswerCheck.evaluate(exercise, pairs, wrong.matches());
            case Answer.PairMistakes counted -> PairAnswerCheck.evaluate(exercise, counted.mistakes());
            default -> throw new UnsupportedAnswerException(exercise, "wrongMatches", answer);
        };
    }
}
