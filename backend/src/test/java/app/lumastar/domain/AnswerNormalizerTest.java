package app.lumastar.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AnswerNormalizerTest {

    @Test
    void lowerCasesAndRemovesPunctuation() {
        assertThat(AnswerNormalizer.normalize("Shpija âsht e madhe!")).isEqualTo("shpija âsht e madhe");
        assertThat(AnswerNormalizer.normalize("„Mirë, po ti?“")).isEqualTo("mirë po ti");
    }

    @Test
    void punctuationBetweenWordsSeparatesThem() {
        assertThat(AnswerNormalizer.normalize("Jo,faleminderit")).isEqualTo("jo faleminderit");
        assertThat(AnswerNormalizer.normalize("Po–faleminderit!Mirë")).isEqualTo("po faleminderit mirë");
        assertThat(AnswerNormalizer.normalize("Po , faleminderit")).isEqualTo("po faleminderit");
    }

    @Test
    void removesApostrophesInsideWords() {
        assertThat(AnswerNormalizer.normalize("S'ka përse.")).isEqualTo("ska përse");
        assertThat(AnswerNormalizer.normalize("S’ka përse.")).isEqualTo("ska përse");
        assertThat(AnswerNormalizer.normalize("S‘ka përse.")).isEqualTo("ska përse");
        assertThat(AnswerNormalizer.normalize("Sʼka përse.")).isEqualTo("ska përse");
    }

    @Test
    void removesSymbolsAndCollapsesWhitespace() {
        assertThat(AnswerNormalizer.normalize("  Mirë – po   ti :-) ")).isEqualTo("mirë po ti");
        assertThat(AnswerNormalizer.normalize("Mirë jam\tsot")).isEqualTo("mirë jam sot");
        assertThat(AnswerNormalizer.normalize("?!")).isEmpty();
    }

    @Test
    void keepsDigitsAndDiacritics() {
        assertThat(AnswerNormalizer.normalize("Âsht 12 çika.")).isEqualTo("âsht 12 çika");
    }

    @Test
    void composesDecomposedCharacters() {
        assertThat(AnswerNormalizer.normalize("Âsht mirë")).isEqualTo("âsht mirë");
    }

    @Test
    void foldsTheAlbanianDiacritics() {
        assertThat(AnswerNormalizer.fold("ë ç â ê î ô û")).isEqualTo("e c a e i o u");
        assertThat(AnswerNormalizer.fold("çka po bân")).isEqualTo("cka po ban");
    }

    @Test
    void leavesOtherLettersUnfolded() {
        assertThat(AnswerNormalizer.fold("grüsse für dich")).isEqualTo("grüsse für dich");
    }
}
