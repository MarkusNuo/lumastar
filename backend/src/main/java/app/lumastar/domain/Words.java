package app.lumastar.domain;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Word-bank and word-order tokens (docs/CONTENT_FORMAT.md, step 5): Unicode NFC, split on whitespace, surrounding
 * non-letters and non-digits stripped, lower case. Inner apostrophes stay, so {@code s'ka} is one token.
 */
public final class Words {

    private static final Pattern WHITESPACE = Pattern.compile("\\s+", Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern EDGE_PUNCTUATION = Pattern.compile("^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$");

    private Words() {
    }

    public static List<String> of(String sentence) {
        return Arrays.stream(WHITESPACE.split(Normalizer.normalize(sentence, Normalizer.Form.NFC).strip()))
                .map(Words::normalize)
                .filter(word -> !word.isEmpty())
                .toList();
    }

    public static List<String> of(List<String> tokens) {
        return of(String.join(" ", tokens));
    }

    private static String normalize(String token) {
        return EDGE_PUNCTUATION.matcher(token).replaceAll("").toLowerCase(Locale.ROOT);
    }
}
