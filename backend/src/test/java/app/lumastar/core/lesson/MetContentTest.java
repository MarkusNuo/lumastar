package app.lumastar.core.lesson;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNullPointerException;

import app.lumastar.domain.Level;
import java.util.List;
import org.junit.jupiter.api.Test;

class MetContentTest {

    @Test
    void contentWithExercisesUpToTheLearnersLevelStaysAtTheLevel() {
        assertThat(MetContent.maxLevel(Level.A1_2, List.of(Level.B1_1, Level.A1_1, Level.A2_1))).contains(Level.A1_2);
        assertThat(MetContent.maxLevel(Level.A1_2, List.of(Level.A1_2))).contains(Level.A1_2);
    }

    @Test
    void contentMetOnlyAboveTheLevelGoesToTheLowestLevelWithExercisesOfIt() {
        assertThat(MetContent.maxLevel(Level.A1_1, List.of(Level.B1_1, Level.A2_2, Level.A2_1))).contains(Level.A2_1);
    }

    @Test
    void contentWithoutExercisesCannotBePractised() {
        assertThat(MetContent.maxLevel(Level.A1_1, List.of())).isEmpty();
    }

    @Test
    void needsTheLearnersLevel() {
        assertThatNullPointerException().isThrownBy(() -> MetContent.maxLevel(null, List.of(Level.A0)));
    }
}
