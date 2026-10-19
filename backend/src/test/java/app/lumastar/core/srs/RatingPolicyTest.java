package app.lumastar.core.srs;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.domain.Outcome;
import app.lumastar.domain.Rating;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** The rating table of PRD F8. */
class RatingPolicyTest {

    private static final Optional<Duration> TYPICAL = Optional.of(Duration.ofSeconds(6));

    @ParameterizedTest(name = "{0} in {1} ms, known {2} → {3}")
    @CsvSource({
            "WRONG,                 6000,  false, AGAIN",
            "WRONG,                 1000,  true,  AGAIN",
            "WRONG,                 30000, true,  AGAIN",
            "ALMOST_CORRECT,        6000,  false, HARD",
            "ALMOST_CORRECT,        1000,  true,  HARD",
            "CORRECT,               6000,  false, GOOD",
            "CORRECT,               12000, true,  GOOD",
            "CORRECT,               12001, true,  HARD",
            "CORRECT_STANDARD_FORM, 6000,  true,  GOOD",
            "CORRECT_STANDARD_FORM, 13000, false, HARD",
            "CORRECT,               2999,  true,  EASY",
            "CORRECT,               3000,  true,  GOOD",
            "CORRECT,               1000,  false, GOOD",
            "CORRECT_STANDARD_FORM, 1000,  true,  EASY"
    })
    void ratesByOutcomeSpeedAndWhetherTheItemIsKnown(Outcome outcome, long responseMs, boolean known, Rating expected) {
        assertThat(RatingPolicy.rate(outcome, Duration.ofMillis(responseMs), TYPICAL, known)).isEqualTo(expected);
    }

    @Test
    void withoutATypicalTimeOnlyTheOutcomeCounts() {
        assertThat(RatingPolicy.rate(Outcome.CORRECT, Duration.ofMinutes(5), Optional.empty(), true)).isEqualTo(Rating.GOOD);
        assertThat(RatingPolicy.rate(Outcome.CORRECT, Duration.ofMillis(10), Optional.empty(), true)).isEqualTo(Rating.GOOD);
        assertThat(RatingPolicy.rate(Outcome.ALMOST_CORRECT, Duration.ofMillis(10), Optional.empty(), true)).isEqualTo(Rating.HARD);
    }

    @Test
    void theTypicalTimeIsTheMedianOfAtLeastTenAnswers() {
        assertThat(RatingPolicy.typicalTime(seconds(9, 4))).isEmpty();
        assertThat(RatingPolicy.typicalTime(seconds(10, 4))).contains(Duration.ofSeconds(4));
        List<Duration> mixed = List.of(Duration.ofSeconds(1), Duration.ofSeconds(2), Duration.ofSeconds(3), Duration.ofSeconds(4),
                Duration.ofSeconds(5), Duration.ofSeconds(6), Duration.ofSeconds(7), Duration.ofSeconds(8), Duration.ofSeconds(9),
                Duration.ofSeconds(100));
        assertThat(RatingPolicy.typicalTime(mixed)).contains(Duration.ofMillis(5500));
    }

    @Test
    void aTypicalTimeOfZeroDisablesTheSpeedRules() {
        assertThat(RatingPolicy.typicalTime(seconds(10, 0))).isEmpty();
    }

    private static List<Duration> seconds(int count, int seconds) {
        return Collections.nCopies(count, Duration.ofSeconds(seconds));
    }
}
