package app.lingora.core.evaluation;

import app.lingora.domain.AnswerNormalizer;
import app.lingora.domain.ErrorCategory;
import app.lingora.domain.EvaluationResult;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload.MatchPairs;
import app.lingora.domain.MatchPair;
import java.util.List;

/**
 * Check of matched pairs. Like every answer built from tiles it is exact (docs/CONTENT_FORMAT.md points 7 and 9): no
 * wrong match is correct, any wrong match is a confusion. The hint names the correct pairs of the confused items.
 */
final class PairAnswerCheck {

    private PairAnswerCheck() {
    }

    static EvaluationResult evaluate(Exercise exercise, MatchPairs pairs, List<MatchPair> wrongMatches) {
        wrongMatches.forEach(match -> requireWrongMatch(exercise, pairs, match));
        if (wrongMatches.isEmpty()) {
            return Results.correct(exercise, null);
        }
        List<MatchPair> confused = pairs.pairs().stream()
                .filter(pair -> wrongMatches.stream().anyMatch(match -> involves(match, pair)))
                .toList();
        return Results.wrong(exercise, ErrorCategory.VOCAB_CONFUSED, null, FeedbackHints.confusedPairs(confused));
    }

    /** The deprecated answer that only counts the wrong matches. */
    static EvaluationResult evaluate(Exercise exercise, int mistakes) {
        return mistakes == 0
                ? Results.correct(exercise, null)
                : Results.wrong(exercise, ErrorCategory.VOCAB_CONFUSED, null, FeedbackHints.pairsMismatched(mistakes));
    }

    /** A wrong match joins the left side of one pair with the right side of another. */
    private static void requireWrongMatch(Exercise exercise, MatchPairs pairs, MatchPair match) {
        boolean knownLeft = pairs.pairs().stream().anyMatch(pair -> same(pair.left(), match.left()));
        boolean knownRight = pairs.pairs().stream().anyMatch(pair -> same(pair.right(), match.right()));
        if (!knownLeft || !knownRight) {
            throw new InvalidAnswerException(exercise, "the wrong match %s → %s is not made of its pairs"
                    .formatted(match.left(), match.right()));
        }
        if (pairs.pairs().stream().anyMatch(pair -> same(pair.left(), match.left()) && same(pair.right(), match.right()))) {
            throw new InvalidAnswerException(exercise, "%s → %s is a correct pair, not a wrong match"
                    .formatted(match.left(), match.right()));
        }
    }

    private static boolean involves(MatchPair match, MatchPair pair) {
        return same(pair.left(), match.left()) || same(pair.right(), match.right());
    }

    private static boolean same(String side, String reported) {
        return AnswerNormalizer.normalize(side).equals(AnswerNormalizer.normalize(reported));
    }
}
