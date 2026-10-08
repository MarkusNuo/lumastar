package app.lingora.core.progress;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class StreakGoalLadderTest {

    @Test
    void theLadderRunsUpToAYearAndThenGrowsByAHundredDays() {
        List<Integer> rungs = IntStream.rangeClosed(0, 1000).filter(StreakGoalLadder::isRung).boxed().toList();

        assertThat(rungs)
                .containsExactly(10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 365, 465, 565, 665, 765, 865, 965);
    }

    @Test
    void everyLearnerStartsWithTenDays() {
        assertThat(StreakGoalLadder.FIRST).isEqualTo(10);
        assertThat(StreakGoal.FIRST).isEqualTo(new StreakGoal(10, null));
    }

    @ParameterizedTest
    @ValueSource(ints = {-10, 0, 1, 9, 11, 25, 40, 364, 366, 400, 415, 464, 500})
    void otherLengthsAreNoRungs(int days) {
        assertThat(StreakGoalLadder.isRung(days)).isFalse();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            10   | 20, 30, 50
            20   | 30, 50, 75
            30   | 50, 75, 100
            50   | 75, 100, 150
            75   | 100, 150, 200
            100  | 150, 200, 250
            200  | 250, 300, 365
            250  | 300, 365, 465
            300  | 365, 465, 565
            365  | 465, 565, 665
            465  | 565, 665, 765
            1065 | 1165, 1265, 1365""")
    void theThreeRungsAboveAReachedGoalAreTheNextOnes(int goal, String expected) {
        assertThat(StreakGoalLadder.rungsAbove(goal, 3)).isEqualTo(numbers(expected));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            -5  | 10
            0   | 10
            9   | 10
            12  | 20
            49  | 50
            51  | 75
            364 | 365
            366 | 465
            400 | 465
            465 | 565
            999 | 1065""")
    void theRungAboveALengthIsTheLowestRungLongerThanIt(int days, int rung) {
        assertThat(StreakGoalLadder.rungAbove(days)).isEqualTo(rung);
    }

    private static List<Integer> numbers(String commaSeparated) {
        return List.of(commaSeparated.split(", ")).stream().map(Integer::valueOf).toList();
    }
}
