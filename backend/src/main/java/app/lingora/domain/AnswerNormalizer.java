package app.lingora.domain;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Answer normalisation of docs/CONTENT_FORMAT.md ("Answer normalisation and tokenisation"), identical in the backend
 * evaluator, the frontend pre-check and the content validator. {@link #normalize} keeps diacritics;
 * {@link #fold} removes them in a separate, later comparison step.
 */
public final class AnswerNormalizer {

    private static final Pattern NEITHER_LETTER_DIGIT_NOR_SPACE =
            Pattern.compile("[^\\p{L}\\p{N}\\s]", Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern WHITESPACE = Pattern.compile("\\s+", Pattern.UNICODE_CHARACTER_CLASS);
    private static final String DIACRITICS = "ëçâêîôû";
    private static final String FOLDED = "ecaeiou";

    private AnswerNormalizer() {
    }

    /** Unicode NFC, lower case, every character that is not a letter, a digit or whitespace removed, single spaces. */
    public static String normalize(String text) {
        String lowerCase = Normalizer.normalize(text, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
        String lettersDigitsAndSpaces = NEITHER_LETTER_DIGIT_NOR_SPACE.matcher(lowerCase).replaceAll("");
        return WHITESPACE.matcher(lettersDigitsAndSpaces).replaceAll(" ").strip();
    }

    /** Replaces ë, ç, â, ê, î, ô and û of a normalised text by their base letter; the length stays the same. */
    public static String fold(String normalized) {
        StringBuilder folded = new StringBuilder(normalized.length());
        for (int i = 0; i < normalized.length(); i++) {
            folded.append(fold(normalized.charAt(i)));
        }
        return folded.toString();
    }

    public static char fold(char character) {
        int index = DIACRITICS.indexOf(character);
        return index < 0 ? character : FOLDED.charAt(index);
    }
}
