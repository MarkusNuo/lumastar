package app.lumastar.core.evaluation;

import app.lumastar.domain.Answer;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Exercise;

/** Binding evaluation of an answer including error category and FSRS rating (PRD F5, F6, F8). */
public interface AnswerEvaluator {

    EvaluationResult evaluate(Exercise exercise, Answer answer);
}
