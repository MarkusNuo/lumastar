package app.lingora.domain;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** Splits a sentence into comparable words: lower case, without surrounding punctuation. */
public final class Words {

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final Pattern EDGE_PUNCTUATION = Pattern.compile("^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$");

    private Words() {
    }

    public static List<String> of(String sentence) {
        return Arrays.stream(WHITESPACE.split(sentence.strip()))
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
