package app.lingora.core.evaluation;

import app.lingora.domain.Answer;
import app.lingora.domain.EvaluationResult;
import app.lingora.domain.Exercise;

/** Binding evaluation of an answer including error category and FSRS rating (PRD F5, F6, F8). */
public interface AnswerEvaluator {

    EvaluationResult evaluate(Exercise exercise, Answer answer);
}
