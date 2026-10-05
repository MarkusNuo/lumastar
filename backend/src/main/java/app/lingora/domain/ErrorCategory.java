package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Error taxonomy of PRD F6. {@link #VARIANT_STANDARD_FORM} is a hint only and never costs points. The German labels
 * contain no brackets, since {@code learner_summary.md} puts them in brackets.
 */
public enum ErrorCategory implements Coded {
    VOCAB_UNKNOWN("vocab.unknown", "Wort nicht gewusst"),
    VOCAB_CONFUSED("vocab.confused", "Wort verwechselt"),
    SPELLING_DIACRITICS("spelling.diacritics", "ë/ç vergessen"),
    SPELLING_NASAL_VOWEL("spelling.nasal_vowel", "Zirkumflex vergessen"),
    SPELLING_OTHER("spelling.other", "Tippfehler"),
    VARIANT_STANDARD_FORM("variant.standard_form", "Standard- statt Gheg-Form"),
    GRAMMAR_DEFINITE_ARTICLE("grammar.definite_article", "bestimmter Artikel"),
    GRAMMAR_CASE("grammar.case", "Kasus"),
    GRAMMAR_LINKING_ARTICLE("grammar.linking_article", "Verbindungsartikel"),
    GRAMMAR_GENDER("grammar.gender", "Genus"),
    GRAMMAR_INFINITIVE("grammar.infinitive", "Infinitiv me + Partizip"),
    GRAMMAR_PARTICIPLE("grammar.participle", "Gheg-Partizip"),
    GRAMMAR_VERB_CONJUGATION("grammar.verb_conjugation", "Konjugation nach Person und Zahl"),
    GRAMMAR_VERB_TENSE("grammar.verb_tense", "Zeitform"),
    GRAMMAR_WORD_ORDER("grammar.word_order", "Wortstellung"),
    GRAMMAR_CLITICS("grammar.clitics", "Pronomen-Kurzformen");

    private final String code;
    private final String label;

    ErrorCategory(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public static ErrorCategory fromCode(String code) {
        return Coded.fromCode(ErrorCategory.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }

    public String label() {
        return label;
    }
}
