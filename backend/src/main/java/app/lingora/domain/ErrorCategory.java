package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Error taxonomy of PRD F6. {@link #VARIANT_STANDARD_FORM} is a hint only and never costs points. */
public enum ErrorCategory implements Coded {
    VOCAB_UNKNOWN("vocab.unknown"),
    VOCAB_CONFUSED("vocab.confused"),
    SPELLING_DIACRITICS("spelling.diacritics"),
    SPELLING_NASAL_VOWEL("spelling.nasal_vowel"),
    SPELLING_OTHER("spelling.other"),
    VARIANT_STANDARD_FORM("variant.standard_form"),
    GRAMMAR_DEFINITE_ARTICLE("grammar.definite_article"),
    GRAMMAR_CASE("grammar.case"),
    GRAMMAR_LINKING_ARTICLE("grammar.linking_article"),
    GRAMMAR_GENDER("grammar.gender"),
    GRAMMAR_INFINITIVE("grammar.infinitive"),
    GRAMMAR_PARTICIPLE("grammar.participle"),
    GRAMMAR_VERB_CONJUGATION("grammar.verb_conjugation"),
    GRAMMAR_VERB_TENSE("grammar.verb_tense"),
    GRAMMAR_WORD_ORDER("grammar.word_order"),
    GRAMMAR_CLITICS("grammar.clitics");

    private final String code;

    ErrorCategory(String code) {
        this.code = code;
    }

    public static ErrorCategory fromCode(String code) {
        return Coded.fromCode(ErrorCategory.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
