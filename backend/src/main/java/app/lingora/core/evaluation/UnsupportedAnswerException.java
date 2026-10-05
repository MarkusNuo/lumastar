package app.lingora.core.evaluation;

import app.lingora.domain.Answer;
import app.lingora.domain.Exercise;

/** The kind of answer does not fit the exercise, e.g. typed text for a multiple-choice exercise. */
public class UnsupportedAnswerException extends IllegalArgumentException {

    UnsupportedAnswerException(Exercise exercise, String expectedKind, Answer answer) {
        super("%s %s expects a %s answer, not %s".formatted(exercise.type().code(), exercise.id(), expectedKind, kindOf(answer)));
    }

    /** The name of the answer kind, as in the API: text, choice, tokens, wrongMatches or mistakes. */
    private static String kindOf(Answer answer) {
        return switch (answer) {
            case Answer.Text _ -> "text";
            case Answer.Choice _ -> "choice";
            case Answer.Tokens _ -> "tokens";
            case Answer.WrongMatches _ -> "wrongMatches";
            case Answer.PairMistakes _ -> "mistakes";
        };
    }
}
