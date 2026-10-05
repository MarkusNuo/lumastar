package app.lingora.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class DurationsTest {

    @Test
    void theMedianOfAnOddCountIsTheMiddleValue() {
        assertThat(Durations.median(List.of(seconds(9), seconds(4), seconds(30)))).isEqualTo(seconds(9));
    }

    @Test
    void theMedianOfAnEvenCountIsTheMeanOfTheMiddleValues() {
        assertThat(Durations.median(List.of(seconds(30), seconds(4), seconds(9), seconds(7)))).isEqualTo(seconds(8));
    }

    @Test
    void needsAtLeastOneValue() {
        assertThatIllegalArgumentException().isThrownBy(() -> Durations.median(List.of()));
    }

    private static Duration seconds(int seconds) {
        return Duration.ofSeconds(seconds);
    }
}
