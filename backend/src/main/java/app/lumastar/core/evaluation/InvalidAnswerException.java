package app.lumastar.core.evaluation;

import app.lumastar.domain.Exercise;

/** The answer has the right kind but cannot come from the exercise, e.g. a wrong match of sides it does not show. */
public class InvalidAnswerException extends IllegalArgumentException {

    InvalidAnswerException(Exercise exercise, String problem) {
        super("%s %s: %s".formatted(exercise.type().code(), exercise.id(), problem));
    }
}
