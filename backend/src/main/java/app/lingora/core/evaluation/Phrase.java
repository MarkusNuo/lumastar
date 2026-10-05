package app.lingora.core.evaluation;

import app.lingora.domain.AnswerNormalizer;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * A solution or an answer in every form the comparison steps need: normalised (diacritics kept), folded, both split
 * into words, and the words as written for feedback texts.
 */
record Phrase(String text, String normalized, String folded, List<String> words, List<String> foldedWords,
              List<String> writtenWords) {

    private static final Pattern WHITESPACE = Pattern.compile("\\s+", Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern EDGE_PUNCTUATION = Pattern.compile("^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$");

    static Phrase of(String text) {
        String normalized = AnswerNormalizer.normalize(text);
        String folded = AnswerNormalizer.fold(normalized);
        return new Phrase(text, normalized, folded, words(normalized), words(folded), writtenWords(text));
    }

    /** The word at {@code index} as written, or its normalised form if the text splits unusually. */
    String writtenWord(int index) {
        return writtenWords.size() == words.size() ? writtenWords.get(index) : words.get(index);
    }

    int letterCount() {
        return normalized.replace(" ", "").length();
    }

    /** The edits from this answer to {@code expected}; a missing diacritic costs nothing, an added or wrong one does. */
    int editsTo(Phrase expected) {
        return EditDistance.between(normalized, expected.normalized, MissingDiacritics::sameOrMissing);
    }

    /** The candidate with the fewest edits from this answer; the earlier candidate wins a tie. */
    Phrase closestOf(List<Phrase> candidates) {
        Phrase closest = candidates.getFirst();
        int fewestEdits = editsTo(closest);
        for (Phrase candidate : candidates.subList(1, candidates.size())) {
            int edits = editsTo(candidate);
            if (edits < fewestEdits) {
                closest = candidate;
                fewestEdits = edits;
            }
        }
        return closest;
    }

    private static List<String> words(String normalized) {
        return normalized.isEmpty() ? List.of() : List.of(normalized.split(" "));
    }

    private static List<String> writtenWords(String text) {
        return Arrays.stream(WHITESPACE.split(text.strip()))
                .filter(chunk -> !AnswerNormalizer.normalize(chunk).isEmpty())
                .map(chunk -> EDGE_PUNCTUATION.matcher(chunk).replaceAll(""))
                .toList();
    }
}
