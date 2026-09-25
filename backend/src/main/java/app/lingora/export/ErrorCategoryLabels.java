package app.lingora.export;

import app.lingora.domain.ErrorCategory;

/** German names of the error categories (PRD F6) as used in {@code learner_summary.md}. */
final class ErrorCategoryLabels {

    private ErrorCategoryLabels() {
    }

    static String of(ErrorCategory category) {
        return switch (category) {
            case VOCAB_UNKNOWN -> "Wort nicht gewusst";
            case VOCAB_CONFUSED -> "Wort verwechselt";
            case SPELLING_DIACRITICS -> "ë/ç vergessen";
            case SPELLING_NASAL_VOWEL -> "Zirkumflex vergessen";
            case SPELLING_OTHER -> "Tippfehler";
            case VARIANT_STANDARD_FORM -> "Standard- statt Gheg-Form";
            case GRAMMAR_DEFINITE_ARTICLE -> "bestimmter Artikel";
            case GRAMMAR_CASE -> "Kasus";
            case GRAMMAR_LINKING_ARTICLE -> "Verbindungsartikel";
            case GRAMMAR_GENDER -> "Genus";
            case GRAMMAR_INFINITIVE -> "Infinitiv me + Partizip";
            case GRAMMAR_PARTICIPLE -> "Gheg-Partizip";
            case GRAMMAR_VERB_CONJUGATION -> "Konjugation (Person/Zahl)";
            case GRAMMAR_VERB_TENSE -> "Zeitform";
            case GRAMMAR_WORD_ORDER -> "Wortstellung";
            case GRAMMAR_CLITICS -> "Pronomen-Kurzformen";
        };
    }
}
