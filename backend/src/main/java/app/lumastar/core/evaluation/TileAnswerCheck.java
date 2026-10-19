package app.lumastar.core.evaluation;

import app.lumastar.domain.AnswerNormalizer;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.Words;
import java.util.List;
import java.util.Optional;

/**
 * Check of a sentence built from word tiles (translate_wordbank, word_order). Tiles are exact (docs/CONTENT_FORMAT.md
 * points 5 and 7): the tokens of a solution in its order are correct, the same tokens in another order are a word-order
 * mistake, anything else is wrong, classified by the error hints or the skill tags. A distractor is never a typo.
 */
final class TileAnswerCheck {

    private TileAnswerCheck() {
    }

    static EvaluationResult evaluate(Exercise exercise, List<String> solutions, List<String> tiles) {
        List<String> tokens = Words.of(tiles);
        Optional<String> exact = solutions.stream().filter(solution -> Words.of(solution).equals(tokens)).findFirst();
        if (exact.isPresent()) {
            return Results.correct(exercise, exact.get());
        }
        Optional<String> reordered = solutions.stream()
                .filter(solution -> sorted(Words.of(solution)).equals(sorted(tokens)))
                .findFirst();
        if (reordered.isPresent()) {
            return Results.wrong(exercise, ErrorCategory.GRAMMAR_WORD_ORDER, reordered.get(), FeedbackHints.wordOrder());
        }
        String sentence = String.join(" ", tiles);
        String closest = Phrase.of(sentence).closestOf(solutions.stream().map(Phrase::of).toList()).text();
        return WrongAnswers.matchingHint(exercise, AnswerNormalizer.normalize(sentence))
                .map(hint -> Results.wrong(exercise, hint.category(), closest, hint.hint()))
                .orElseGet(() -> Results.wrong(exercise,
                        WrongAnswers.categoryFromSkillTags(exercise, ErrorCategory.VOCAB_UNKNOWN), closest, null));
    }

    private static List<String> sorted(List<String> tokens) {
        return tokens.stream().sorted().toList();
    }
}
