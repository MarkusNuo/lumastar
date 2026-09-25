package app.lingora.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class WordsTest {

    @Test
    void lowerCasesAndStripsSurroundingPunctuation() {
        assertThat(Words.of("Mirëdita, si je?")).containsExactly("mirëdita", "si", "je");
        assertThat(Words.of("„Shpija âsht e madhe.“")).containsExactly("shpija", "âsht", "e", "madhe");
    }

    @Test
    void keepsApostrophesInsideAWord() {
        assertThat(Words.of("S'jam mirë")).containsExactly("s'jam", "mirë");
    }

    @Test
    void ignoresStandalonePunctuationAndExtraWhitespace() {
        assertThat(Words.of(List.of("Si", "je", "?"))).containsExactly("si", "je");
        assertThat(Words.of("  Po  ,  jo ")).containsExactly("po", "jo");
        assertThat(Words.of(" ")).isEmpty();
    }
}
