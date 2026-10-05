package app.lingora.core.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class DifficultyWindowTest {

    @Test
    void needsTwoLessonsOfTheUnit() {
        assertThat(DifficultyWindow.after(List.of())).isEqualTo(DifficultyWindow.USUAL);
        assertThat(DifficultyWindow.after(List.of(1.0))).isEqualTo(DifficultyWindow.USUAL);
        assertThat(DifficultyWindow.after(List.of(0.2))).isEqualTo(DifficultyWindow.USUAL);
    }

    @Test
    void judgesTheLastTwoLessonsOnly() {
        assertThat(DifficultyWindow.after(List.of(0.95, 0.91, 0.3))).isEqualTo(DifficultyWindow.HARDER);
        assertThat(DifficultyWindow.after(List.of(0.5, 0.59, 1.0))).isEqualTo(DifficultyWindow.EASIER);
        assertThat(DifficultyWindow.after(List.of(0.95, 0.5))).isEqualTo(DifficultyWindow.USUAL);
    }

    @Test
    void theThresholdsThemselvesKeepTheUsualDifficulty() {
        assertThat(DifficultyWindow.after(List.of(0.9, 0.95))).isEqualTo(DifficultyWindow.USUAL);
        assertThat(DifficultyWindow.after(List.of(0.6, 0.5))).isEqualTo(DifficultyWindow.USUAL);
    }
}
