package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class PracticeCompletionTest {

    private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Test
    void isALessonOrAPlacementTest() {
        assertThat(PracticeCompletion.lesson(ID)).isEqualTo(new PracticeCompletion(ID, null));
        assertThat(PracticeCompletion.placementTest(ID)).isEqualTo(new PracticeCompletion(null, ID));
    }

    @Test
    void isNeverBoth() {
        assertThatThrownBy(() -> new PracticeCompletion(ID, ID)).isInstanceOf(IllegalArgumentException.class);
    }
}
