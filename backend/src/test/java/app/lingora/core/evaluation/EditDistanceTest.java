package app.lingora.core.evaluation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EditDistanceTest {

    @Test
    void identicalTextsHaveNoDistance() {
        assertThat(EditDistance.between("shpija", "shpija")).isZero();
        assertThat(EditDistance.between("", "")).isZero();
    }

    @Test
    void countsInsertionsDeletionsAndSubstitutions() {
        assertThat(EditDistance.between("shpja", "shpija")).isEqualTo(1);
        assertThat(EditDistance.between("shpija", "shpja")).isEqualTo(1);
        assertThat(EditDistance.between("madhe", "madhi")).isEqualTo(1);
        assertThat(EditDistance.between("", "jam")).isEqualTo(3);
    }

    @Test
    void countsASwapOfAdjacentLettersAsOneEdit() {
        assertThat(EditDistance.between("mahde", "madhe")).isEqualTo(1);
        assertThat(EditDistance.between("faleminderti", "faleminderit")).isEqualTo(1);
    }

    @Test
    void neverEditsASwappedPairTwice() {
        // Optimal string alignment: "ca" → "abc" needs three edits, not two.
        assertThat(EditDistance.between("ca", "abc")).isEqualTo(3);
    }
}
