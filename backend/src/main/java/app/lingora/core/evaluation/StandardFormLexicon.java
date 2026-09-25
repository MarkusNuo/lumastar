package app.lingora.core.evaluation;

import app.lingora.domain.AnswerNormalizer;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.UnaryOperator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Standard Albanian (Tosk-based) forms with their Gheg equivalents, built from {@code content/gheg_blocklist.json}.
 * It recognises a learner's word as the Standard counterpart of a Gheg solution word: {@code është} for {@code âsht}
 * (listed word), {@code punuar} for {@code punue} or {@code shtëpia} for {@code shpija} (word patterns).
 */
public final class StandardFormLexicon {

    private static final String VOWELS = "aeëiouyâêîôû";
    // Gheg inserts a glide between a stem ending in -i and a vowel ending: shpi + a → shpija.
    private static final String GLIDE = "j";

    private final Forms exact;
    private final Forms folded;

    /** A Standard word and its Gheg alternatives, e.g. {@code qenë} → {@code kânë, kjenë}. */
    public record Word(String standard, List<String> gheg) {

        public Word {
            Objects.requireNonNull(standard, "standard");
            gheg = List.copyOf(gheg);
        }
    }

    /**
     * A regular expression on a single Standard word with its Gheg replacements: {@code -ue} replaces the matched
     * ending, {@code shpi-} the matched beginning, anything else the whole word. {@code exceptions} are words that
     * match but are no Standard forms.
     */
    public record WordPattern(String regex, List<String> gheg, List<String> exceptions) {

        public WordPattern {
            Objects.requireNonNull(regex, "regex");
            gheg = List.copyOf(gheg);
            exceptions = List.copyOf(exceptions);
        }
    }

    private StandardFormLexicon(List<Word> words, List<WordPattern> patterns) {
        this.exact = Forms.of(words, patterns, UnaryOperator.identity());
        this.folded = Forms.of(words, patterns, AnswerNormalizer::fold);
    }

    public static StandardFormLexicon of(List<Word> words, List<WordPattern> patterns) {
        return new StandardFormLexicon(words, patterns);
    }

    public static StandardFormLexicon empty() {
        return new StandardFormLexicon(List.of(), List.of());
    }

    /**
     * Whether {@code answerWord} is the Standard form of {@code ghegWord}. Both are normalised words; with
     * {@code foldedWords} both are also folded, so that a Standard form without its diacritics is recognised too.
     */
    boolean isStandardFormOf(String answerWord, String ghegWord, boolean foldedWords) {
        return (foldedWords ? folded : exact).links(answerWord, ghegWord);
    }

    private record Forms(Map<String, Set<String>> ghegByStandard, List<CompiledPattern> patterns) {

        static Forms of(List<Word> words, List<WordPattern> patterns, UnaryOperator<String> form) {
            UnaryOperator<String> normalized = text -> form.apply(AnswerNormalizer.normalize(text));
            Map<String, Set<String>> ghegByStandard = new HashMap<>();
            for (Word word : words) {
                ghegByStandard.computeIfAbsent(normalized.apply(word.standard()), key -> new HashSet<>())
                        .addAll(word.gheg().stream().map(normalized).toList());
            }
            List<CompiledPattern> compiled = patterns.stream()
                    .map(pattern -> new CompiledPattern(
                            Pattern.compile(form.apply(pattern.regex()), Pattern.UNICODE_CHARACTER_CLASS),
                            pattern.gheg().stream().map(gheg -> Affix.parse(gheg, normalized)).toList(),
                            Set.copyOf(pattern.exceptions().stream().map(normalized).toList())))
                    .toList();
            return new Forms(Map.copyOf(ghegByStandard), compiled);
        }

        boolean links(String answerWord, String ghegWord) {
            return ghegByStandard.getOrDefault(answerWord, Set.of()).contains(ghegWord)
                    || patterns.stream().anyMatch(pattern -> pattern.links(answerWord, ghegWord));
        }
    }

    private record CompiledPattern(Pattern regex, List<Affix> gheg, Set<String> exceptions) {

        boolean links(String answerWord, String ghegWord) {
            if (exceptions.contains(answerWord)) {
                return false;
            }
            Matcher match = regex.matcher(answerWord);
            return match.find() && gheg.stream().anyMatch(affix -> affix.links(answerWord, match.start(), match.end(), ghegWord));
        }
    }

    private sealed interface Affix {

        static Affix parse(String gheg, UnaryOperator<String> normalized) {
            String text = gheg.strip();
            if (text.startsWith("-")) {
                return new Suffix(normalized.apply(text.substring(1)));
            }
            if (text.endsWith("-")) {
                return new Prefix(normalized.apply(text.substring(0, text.length() - 1)));
            }
            return new WholeWord(normalized.apply(text));
        }

        /** Whether replacing the matched part {@code [start, end)} of the Standard word yields {@code ghegWord}. */
        boolean links(String standardWord, int start, int end, String ghegWord);
    }

    /** Replaces the matched ending; the Gheg word may carry its own inflection after the suffix (punuem, punuemi). */
    private record Suffix(String value) implements Affix {

        @Override
        public boolean links(String standardWord, int start, int end, String ghegWord) {
            return ghegWord.startsWith(standardWord.substring(0, start) + value);
        }
    }

    private record Prefix(String value) implements Affix {

        @Override
        public boolean links(String standardWord, int start, int end, String ghegWord) {
            String ending = standardWord.substring(end);
            return ghegWord.equals(value + ending)
                    || (!ending.isEmpty() && VOWELS.indexOf(ending.charAt(0)) >= 0 && ghegWord.equals(value + GLIDE + ending));
        }
    }

    private record WholeWord(String value) implements Affix {

        @Override
        public boolean links(String standardWord, int start, int end, String ghegWord) {
            return ghegWord.equals(value);
        }
    }
}
