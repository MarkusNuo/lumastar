package app.lumastar.core.evaluation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MissingDiacriticsTest {

    @Test
    void thePlainLetterStandsForTheLetterWithDiacritic() {
        assertThat(MissingDiacritics.atMost("asht", "âsht")).isTrue();
        assertThat(MissingDiacritics.atMost("cka po ban", "çka po bân")).isTrue();
        assertThat(MissingDiacritics.atMost("zemer", "zemër")).isTrue();
    }

    @Test
    void identicalTextsDifferInNothing() {
        assertThat(MissingDiacritics.atMost("âsht", "âsht")).isTrue();
        assertThat(MissingDiacritics.atMost("", "")).isTrue();
    }

    @Test
    void anAddedOrWrongDiacriticIsNoMissingOne() {
        assertThat(MissingDiacritics.atMost("jâm", "jam")).isFalse();
        assertThat(MissingDiacritics.atMost("mirêdita", "mirëdita")).isFalse();
        assertThat(MissingDiacritics.atMost("âsht", "asht")).isFalse();
    }

    @Test
    void otherLettersAndLengthsMustBeEqual() {
        assertThat(MissingDiacritics.atMost("osht", "âsht")).isFalse();
        assertThat(MissingDiacritics.atMost("ash", "âsht")).isFalse();
    }
}
