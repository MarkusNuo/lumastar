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
 * (listed word), {@code punuar} for {@code punue} or {@code shtëpia} for {@code shpija} (word patterns). All forms are
 * kept normalised (docs/CONTENT_FORMAT.md points 1–2), so the app's pre-check can apply the same rules.
 */
public final class StandardFormLexicon {

    private static final String VOWELS = "aeëiouyâêîôû";
    // Gheg inserts a glide between a stem ending in -i and a vowel ending: shpi + a → shpija.
    private static final String GLIDE = "j";

    private final List<Word> words;
    private final List<WordPattern> patterns;
    private final Forms exact;
    private final Forms folded;

    /** A Standard word and its Gheg alternatives, e.g. {@code qenë} → {@code kânë, kjenë}. */
    public record Word(String standard, List<String> gheg) {

        public Word {
            Objects.requireNonNull(standard, "standard");
            gheg = List.copyOf(gheg);
        }

        private Word map(UnaryOperator<String> form) {
            return new Word(form.apply(standard), gheg.stream().map(form).toList());
        }
    }

    /**
     * A regular expression on a single Standard word with its Gheg replacements. {@code exceptions} are words that
     * match but are no Standard forms.
     */
    public record WordPattern(String id, String regex, List<Replacement> gheg, List<String> exceptions) {

        public WordPattern {
            Objects.requireNonNull(id, "id");
            Objects.requireNonNull(regex, "regex");
            gheg = List.copyOf(gheg);
            exceptions = List.copyOf(exceptions);
        }

        private WordPattern map(UnaryOperator<String> form) {
            return new WordPattern(id, regex, gheg.stream().map(replacement -> replacement.map(form)).toList(),
                    exceptions.stream().map(form).toList());
        }
    }

    /** What replaces the part of a Standard word that its pattern matched. */
    public record Replacement(Kind kind, String value) {

        public enum Kind {
            /** Replaces the matched ending; the Gheg word may carry its own inflection after it (punuem, punuemi). */
            SUFFIX,
            /** Replaces the matched beginning and keeps the rest, with a glide j before a vowel (shpi + a → shpija). */
            PREFIX,
            /** Replaces the whole word. */
            WORD
        }

        public Replacement {
            Objects.requireNonNull(kind, "kind");
            Objects.requireNonNull(value, "value");
        }

        /** {@code -ue} replaces the matched ending, {@code shpi-} the matched beginning, anything else the whole word. */
        public static Replacement parse(String gheg) {
            String text = gheg.strip();
            if (text.startsWith("-")) {
                return new Replacement(Kind.SUFFIX, text.substring(1));
            }
            if (text.endsWith("-")) {
                return new Replacement(Kind.PREFIX, text.substring(0, text.length() - 1));
            }
            return new Replacement(Kind.WORD, text);
        }

        private Replacement map(UnaryOperator<String> form) {
            return new Replacement(kind, form.apply(value));
        }

        /** Whether replacing the matched part {@code [start, end)} of the Standard word yields {@code ghegWord}. */
        private boolean links(String standardWord, int start, int end, String ghegWord) {
            return switch (kind) {
                case SUFFIX -> ghegWord.startsWith(standardWord.substring(0, start) + value);
                case PREFIX -> {
                    String ending = standardWord.substring(end);
                    yield ghegWord.equals(value + ending) || (!ending.isEmpty() && VOWELS.indexOf(ending.charAt(0)) >= 0
                            && ghegWord.equals(value + GLIDE + ending));
                }
                case WORD -> ghegWord.equals(value);
            };
        }
    }

    private StandardFormLexicon(List<Word> words, List<WordPattern> patterns) {
        this.words = words.stream().map(word -> word.map(AnswerNormalizer::normalize)).toList();
        this.patterns = patterns.stream().map(pattern -> pattern.map(AnswerNormalizer::normalize)).toList();
        this.exact = Forms.of(this.words, this.patterns, UnaryOperator.identity());
        this.folded = Forms.of(this.words, this.patterns, AnswerNormalizer::fold);
    }

    public static StandardFormLexicon of(List<Word> words, List<WordPattern> patterns) {
        return new StandardFormLexicon(words, patterns);
    }

    public static StandardFormLexicon empty() {
        return new StandardFormLexicon(List.of(), List.of());
    }

    /** The listed words, normalised. */
    public List<Word> words() {
        return words;
    }

    /** The word patterns with normalised replacements and exceptions. */
    public List<WordPattern> patterns() {
        return patterns;
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
            Map<String, Set<String>> ghegByStandard = new HashMap<>();
            for (Word word : words.stream().map(word -> word.map(form)).toList()) {
                ghegByStandard.computeIfAbsent(word.standard(), key -> new HashSet<>()).addAll(word.gheg());
            }
            List<CompiledPattern> compiled = patterns.stream()
                    .map(pattern -> pattern.map(form))
                    .map(pattern -> new CompiledPattern(
                            Pattern.compile(form.apply(pattern.regex()), Pattern.UNICODE_CHARACTER_CLASS),
                            pattern.gheg(), Set.copyOf(pattern.exceptions())))
                    .toList();
            return new Forms(Map.copyOf(ghegByStandard), compiled);
        }

        boolean links(String answerWord, String ghegWord) {
            return ghegByStandard.getOrDefault(answerWord, Set.of()).contains(ghegWord)
                    || patterns.stream().anyMatch(pattern -> pattern.links(answerWord, ghegWord));
        }
    }

    private record CompiledPattern(Pattern regex, List<Replacement> gheg, Set<String> exceptions) {

        boolean links(String answerWord, String ghegWord) {
            if (exceptions.contains(answerWord)) {
                return false;
            }
            Matcher match = regex.matcher(answerWord);
            return match.find() && gheg.stream().anyMatch(replacement ->
                    replacement.links(answerWord, match.start(), match.end(), ghegWord));
        }
    }
}
