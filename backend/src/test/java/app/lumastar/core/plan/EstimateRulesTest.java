package app.lumastar.core.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.lumastar.domain.CefrBand;
import app.lumastar.domain.Level;
import org.junit.jupiter.api.Test;

class EstimateRulesTest {

    private final EstimateRules rules = EstimateRules.DEFAULT;

    @Test
    void countsTheCumulativeHoursOfTheBandFromZero() {
        assertThat(rules.minutesFrom(Level.A0, CefrBand.A1)).isEqualTo(90 * 60);
        assertThat(rules.minutesFrom(Level.A0, CefrBand.C2)).isEqualTo(1100 * 60);
    }

    @Test
    void startsEachSubStageAThirdFurtherIntoItsBand() {
        assertThat(rules.minutesFrom(Level.A1_1, CefrBand.A1)).isEqualTo(90 * 60);
        assertThat(rules.minutesFrom(Level.A1_2, CefrBand.A1)).isEqualTo(60 * 60);
        assertThat(rules.minutesFrom(Level.A1_3, CefrBand.A1)).isEqualTo(30 * 60);
        assertThat(rules.minutesFrom(Level.A2_1, CefrBand.A2)).isEqualTo(100 * 60);
        // C2.3 starts at 750 + 2/3 × 350 h
        assertThat(rules.minutesFrom(Level.C2_3, CefrBand.C2)).isEqualTo(7000);
    }

    @Test
    void aBandBelowTheLearnersStageNeedsNoMoreTime() {
        assertThat(rules.minutesFrom(Level.A2_1, CefrBand.A1)).isZero();
    }

    @Test
    void rejectsDecreasingHoursAndLessonsWithoutDuration() {
        assertThatIllegalArgumentException().isThrownBy(() -> new EstimateRules(4, 90, 80, 375, 550, 750, 1100));
        assertThatIllegalArgumentException().isThrownBy(() -> new EstimateRules(0, 90, 190, 375, 550, 750, 1100));
    }
}
