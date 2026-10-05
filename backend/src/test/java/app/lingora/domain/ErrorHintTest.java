package app.lingora.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ErrorHintTest {

    private static ErrorHint hint(String pattern) {
        return new ErrorHint(pattern, ErrorCategory.GRAMMAR_DEFINITE_ARTICLE, null);
    }

    @Test
    void matchesAnywhereInTheAnswer() {
        assertThat(hint("\\bshpi\\b").matches("une jam ne shpi")).isTrue();
        assertThat(hint("^shpi\\b").matches("shpija asht e madhe")).isFalse();
    }

    @Test
    void ignoresTheCaseOfGhegLettersToo() {
        assertThat(hint("^ÇOHET$").matches("çohet")).isTrue();
        assertThat(hint("^Âsht$").matches("âsht")).isTrue();
    }

    @Test
    void keepsTheDiacritics() {
        assertThat(hint("^asht$").matches("âsht")).isFalse();
        assertThat(hint("^[aâ]sht$").matches("âsht")).isTrue();
    }

    @Test
    void treatsGhegLettersAsWordCharacters() {
        assertThat(hint("\\bnë\\b").matches("jam në shpi")).isTrue();
        assertThat(hint("^n\\b").matches("në shpi")).isFalse();
    }
}
