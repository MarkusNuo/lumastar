package app.lumastar.content;

import app.lumastar.core.evaluation.AnswerEvaluator;
import app.lumastar.domain.Answer;
import app.lumastar.domain.AnswerNormalizer;
import app.lumastar.domain.ErrorHint;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExercisePayload.FillGap;
import app.lumastar.domain.ExercisePayload.MatchPairs;
import app.lumastar.domain.ExercisePayload.MultipleChoice;
import app.lumastar.domain.ExercisePayload.TranslateFree;
import app.lumastar.domain.ExercisePayload.TranslateWordbank;
import app.lumastar.domain.ExercisePayload.WordOrder;
import app.lumastar.domain.MatchPair;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.Words;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Checks an exercise against its own data with the evaluator: every solution is correct, every Standard form of a typed
 * answer is recognised as one, no distractor is correct, and no error hint fires on a solution. Picked options, tiles
 * and pairs are exact (docs/CONTENT_FORMAT.md point 7), so Standard forms only count for typed answers.
 */
final class ExerciseSelfCheck {

    private static final Duration RESPONSE_TIME = Duration.ofSeconds(4);

    private final AnswerEvaluator evaluator;

    ExerciseSelfCheck(AnswerEvaluator evaluator) {
        this.evaluator = evaluator;
    }

    /** What is inconsistent, one sentence per problem; empty for a consistent exercise. */
    List<String> violations(Exercise exercise) {
        return new Check(exercise).run();
    }

    private final class Check {

        private final Exercise exercise;
        private final List<String> violations = new ArrayList<>();

        Check(Exercise exercise) {
            this.exercise = exercise;
        }

        List<String> run() {
            switch (exercise.payload()) {
                case MultipleChoice choice -> pickedOptions(choice.choices(), choice.solutions());
                case FillGap gap when !gap.choices().isEmpty() -> pickedOptions(gap.choices(), gap.solutions());
                case FillGap gap -> typed(gap.solutions(), gap.standardForms());
                case TranslateFree free -> typed(free.solutions(), free.standardForms());
                case TranslateWordbank bank -> wordBank(bank);
                case WordOrder order -> wordOrder(order);
                case MatchPairs pairs -> matchedPairs(pairs);
            }
            return violations;
        }

        private void pickedOptions(List<String> choices, List<String> solutions) {
            solutions.forEach(solution -> expect(new Answer.Choice(solution, RESPONSE_TIME), Outcome.CORRECT,
                    "the solution '%s'".formatted(solution)));
            choices.stream()
                    .filter(choice -> !solutions.contains(choice))
                    .forEach(distractor -> expect(new Answer.Choice(distractor, RESPONSE_TIME), Outcome.WRONG,
                            "the distractor '%s'".formatted(distractor)));
            noHintMatches(solutions);
        }

        private void typed(List<String> solutions, List<String> standardForms) {
            solutions.forEach(solution -> expect(new Answer.Text(solution, RESPONSE_TIME), Outcome.CORRECT,
                    "the solution '%s'".formatted(solution)));
            standardForms.forEach(form -> expect(new Answer.Text(form, RESPONSE_TIME), Outcome.CORRECT_STANDARD_FORM,
                    "the Standard form '%s'".formatted(form)));
            noHintMatches(solutions);
        }

        /** A distractor tile is wrong on its own and in place of any word of the first solution. */
        private void wordBank(TranslateWordbank bank) {
            bank.solutions().forEach(this::tokenisedSolution);
            List<String> first = Words.of(bank.solutions().getFirst());
            for (String distractor : distractors(Words.of(bank.wordBank()), first)) {
                expect(tiles(List.of(distractor)), Outcome.WRONG, "the distractor tile '%s' alone".formatted(distractor));
                for (int i = 0; i < first.size(); i++) {
                    List<String> swapped = new ArrayList<>(first);
                    swapped.set(i, distractor);
                    expect(tiles(swapped), Outcome.WRONG, "the distractor tile '%s' in place of '%s'".formatted(distractor, first.get(i)));
                }
            }
            noHintMatches(bank.solutions());
        }

        private void wordOrder(WordOrder order) {
            expect(tiles(order.tokens()), Outcome.CORRECT, "the tokens %s in their order".formatted(order.tokens()));
            order.solutions().forEach(this::tokenisedSolution);
            noHintMatches(order.solutions());
        }

        /** Every wrong match joins the left side of one pair with the right side of another and must count as wrong. */
        private void matchedPairs(MatchPairs pairs) {
            expect(new Answer.WrongMatches(List.of(), RESPONSE_TIME), Outcome.CORRECT, "matching every pair at once");
            for (MatchPair left : pairs.pairs()) {
                for (MatchPair right : pairs.pairs()) {
                    if (left != right) {
                        MatchPair wrong = new MatchPair(left.left(), right.right());
                        expect(new Answer.WrongMatches(List.of(wrong), RESPONSE_TIME), Outcome.WRONG,
                                "the wrong match '%s' → '%s'".formatted(wrong.left(), wrong.right()));
                    }
                }
            }
        }

        private void tokenisedSolution(String solution) {
            expect(tiles(Words.of(solution)), Outcome.CORRECT, "the tiles of the solution '%s'".formatted(solution));
        }

        private void noHintMatches(List<String> solutions) {
            for (ErrorHint hint : exercise.errorHints()) {
                solutions.stream()
                        .filter(solution -> hint.matches(AnswerNormalizer.normalize(solution)))
                        .forEach(solution -> violations.add("the error hint /%s/ (%s) matches the solution '%s'"
                                .formatted(hint.pattern(), hint.category().code(), solution)));
            }
        }

        private void expect(Answer answer, Outcome expected, String description) {
            try {
                EvaluationResult result = evaluator.evaluate(exercise, answer);
                if (result.outcome() != expected) {
                    violations.add("%s evaluates to %s%s instead of %s".formatted(description, result.outcome().code(),
                            result.errorCategory() == null ? "" : " (" + result.errorCategory().code() + ")", expected.code()));
                }
            } catch (IllegalArgumentException rejected) {
                violations.add("%s is rejected: %s".formatted(description, rejected.getMessage()));
            }
        }
    }

    private static Answer tiles(List<String> tokens) {
        return new Answer.Tokens(tokens, RESPONSE_TIME);
    }

    /** The bank's words that are left once the words of the first solution are taken out, each occurrence once. */
    private static List<String> distractors(List<String> bankWords, List<String> solutionWords) {
        List<String> distractors = new ArrayList<>(bankWords);
        solutionWords.forEach(distractors::remove);
        return distractors.stream().distinct().toList();
    }
}
