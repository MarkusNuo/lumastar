package app.lingora.core.evaluation;

import app.lingora.domain.MatchPair;
import java.util.List;
import java.util.stream.Collectors;

/** German hint texts of the feedback sheet; words to look at are set in {@code **bold**}. */
final class FeedbackHints {

    private static final int MAX_LISTED_SWAPS = 3;

    /** A Gheg word of the solution and the Standard word the learner wrote instead. */
    record WordSwap(String gheg, String standard) {
    }

    private FeedbackHints() {
    }

    static String standardForm(List<WordSwap> swaps, String solution) {
        if (swaps.isEmpty() || swaps.size() > MAX_LISTED_SWAPS) {
            return "Auf Gheg sagt man eher: „%s“".formatted(solution);
        }
        List<String> phrases = swaps.stream()
                .map(swap -> "**%s** statt **%s**".formatted(swap.gheg(), swap.standard()))
                .toList();
        return "Auf Gheg sagt man eher %s.".formatted(enumerate(phrases));
    }

    static String missingCircumflex(List<String> words) {
        return "Achte auf den Zirkumflex: " + bold(words);
    }

    static String missingDiacritics(List<String> words) {
        return "Achte auf die Sonderzeichen: " + bold(words);
    }

    static String typo(List<String> words) {
        return "Achte auf die Schreibweise: " + bold(words);
    }

    static String wordOrder() {
        return "Die Wörter stimmen, aber die Reihenfolge noch nicht.";
    }

    static String pairsMismatched(int mistakes) {
        return mistakes == 1
                ? "Ein Paar hast du zuerst falsch zugeordnet."
                : "Du hast %d Paare zuerst falsch zugeordnet.".formatted(mistakes);
    }

    /** The correct pairs of the items the learner confused, e.g. „Richtig ist: **ujë** = Wasser und **qumësht** = Milch.“ */
    static String confusedPairs(List<MatchPair> pairs) {
        List<String> phrases = pairs.stream().map(pair -> "**%s** = %s".formatted(pair.left(), pair.right())).toList();
        return "Richtig ist: %s.".formatted(enumerate(phrases));
    }

    private static String bold(List<String> words) {
        return words.stream().map(word -> "**" + word + "**").collect(Collectors.joining(", "));
    }

    private static String enumerate(List<String> phrases) {
        if (phrases.size() == 1) {
            return phrases.getFirst();
        }
        return String.join(", ", phrases.subList(0, phrases.size() - 1)) + " und " + phrases.getLast();
    }
}
