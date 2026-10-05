package app.lingora.api.content;

import app.lingora.core.evaluation.StandardFormLexicon;
import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "The Standard-form lexicon of content/gheg_blocklist.json. All words, values and exceptions are "
        + "normalised (docs/CONTENT_FORMAT.md points 1–2). A learner's word is the Standard form of the solution's Gheg word "
        + "if it is a listed standard word with that Gheg word, or if it matches a pattern, is none of its exceptions and "
        + "one of the pattern's replacements yields the Gheg word. For the comparison with missing diacritics, fold every "
        + "word, value, exception and the pattern itself (ë→e, ç→c, â→a, ê→e, î→i, ô→o, û→u) before matching.")
public record StandardFormsResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<StandardWord> words,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<StandardWordPattern> patterns) {

    @Schema(description = "A Standard word and its Gheg alternatives, e.g. qenë → kânë, kjenë")
    public record StandardWord(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String standard,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<String> gheg) {
    }

    @Schema(description = "Standard words recognised by a regular expression on the single word, e.g. punuar → punue")
    public record StandardWordPattern(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "participle_uar") String id,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Unicode regular expression, searched "
                    + "(not fully matched) in the normalised word", example = "uar(a|at|ave|e|i|in|it|ës|ën)?$")
            String pattern,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<GhegReplacement> gheg,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Words that match but are no Standard forms")
            List<String> exceptions) {
    }

    @Schema(description = "suffix: the word before the match + value must begin the Gheg word (which may carry an "
            + "inflection ending: punuar → punue, punuem, punuemi). prefix: value + the word after the match must equal the "
            + "Gheg word, also with a j between them if the rest begins with a vowel (shtëpia → shpija). word: value must "
            + "equal the Gheg word.")
    public record GhegReplacement(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Kind kind,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String value) {
    }

    @Schema(name = "GhegReplacementKind")
    public enum Kind {
        SUFFIX("suffix"),
        PREFIX("prefix"),
        WORD("word");

        private final String code;

        Kind(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    static StandardFormsResponse of(StandardFormLexicon lexicon) {
        return new StandardFormsResponse(
                lexicon.words().stream().map(word -> new StandardWord(word.standard(), word.gheg())).toList(),
                lexicon.patterns().stream()
                        .map(pattern -> new StandardWordPattern(pattern.id(), pattern.regex(),
                                pattern.gheg().stream().map(StandardFormsResponse::replacement).toList(), pattern.exceptions()))
                        .toList());
    }

    private static GhegReplacement replacement(StandardFormLexicon.Replacement replacement) {
        Kind kind = switch (replacement.kind()) {
            case SUFFIX -> Kind.SUFFIX;
            case PREFIX -> Kind.PREFIX;
            case WORD -> Kind.WORD;
        };
        return new GhegReplacement(kind, replacement.value());
    }
}
