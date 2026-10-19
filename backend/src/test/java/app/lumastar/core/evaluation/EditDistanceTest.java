package app.lumastar.core.evaluation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EditDistanceTest {

    @Test
    void identicalTextsHaveNoDistance() {
        assertThat(exact("shpija", "shpija")).isZero();
        assertThat(exact("", "")).isZero();
    }

    @Test
    void countsInsertionsDeletionsAndSubstitutions() {
        assertThat(exact("shpja", "shpija")).isEqualTo(1);
        assertThat(exact("shpija", "shpja")).isEqualTo(1);
        assertThat(exact("madhe", "madhi")).isEqualTo(1);
        assertThat(exact("", "jam")).isEqualTo(3);
    }

    @Test
    void countsASwapOfAdjacentLettersAsOneEdit() {
        assertThat(exact("mahde", "madhe")).isEqualTo(1);
        assertThat(exact("faleminderti", "faleminderit")).isEqualTo(1);
    }

    @Test
    void neverEditsASwappedPairTwice() {
        // Optimal string alignment: "ca" → "abc" needs three edits, not two.
        assertThat(exact("ca", "abc")).isEqualTo(3);
    }

    @Test
    void charactersAcceptedByTheMatchCostNothing() {
        assertThat(missingDiacriticsFree("ban", "bân")).isZero();
        assertThat(missingDiacriticsFree("mirmbrama", "mirëmbrâma")).isEqualTo(1);
        assertThat(missingDiacriticsFree("cak", "çka")).isEqualTo(1);
    }

    @Test
    void theMatchIsDirectedFromTheWrittenToTheExpectedCharacter() {
        assertThat(missingDiacriticsFree("jâm", "jam")).isEqualTo(1);
        assertThat(missingDiacriticsFree("mirêdita", "mirëdita")).isEqualTo(1);
    }

    private static int exact(String written, String expected) {
        return EditDistance.between(written, expected, (a, b) -> a == b);
    }

    private static int missingDiacriticsFree(String written, String expected) {
        return EditDistance.between(written, expected, MissingDiacritics::sameOrMissing);
    }
}
