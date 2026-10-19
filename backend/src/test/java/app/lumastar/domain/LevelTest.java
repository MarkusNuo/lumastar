package app.lumastar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

class LevelTest {

    private static final List<String> CODES_IN_ORDER = List.of("A0", "A1.1", "A1.2", "A1.3", "A2.1", "A2.2", "A2.3",
            "B1.1", "B1.2", "B1.3", "B2.1", "B2.2", "B2.3", "C1.1", "C1.2", "C1.3", "C2.1", "C2.2", "C2.3");

    @Test
    void hasNineteenStagesInAscendingOrder() {
        assertThat(Arrays.stream(Level.values()).map(Level::code)).containsExactlyElementsOf(CODES_IN_ORDER);
        assertThat(Level.lowest()).isEqualTo(Level.A0);
        assertThat(Level.highest()).isEqualTo(Level.C2_3);
    }

    @ParameterizedTest
    @EnumSource(Level.class)
    void parsesItsOwnCode(Level level) {
        assertThat(Level.fromCode(level.code())).isEqualTo(level);
    }

    @ParameterizedTest
    @ValueSource(strings = {"A1", "a1.1", "A1_1", "C3.1", " A0", ""})
    void rejectsUnknownCodesWithTheAllowedValues(String code) {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> Level.fromCode(code))
                .withMessageContaining("Unknown Level '%s'".formatted(code))
                .withMessageContaining("A0, A1.1, A1.2");
    }

    @Test
    void rejectsMissingCode() {
        assertThatIllegalArgumentException().isThrownBy(() -> Level.fromCode(null));
    }

    @Test
    void stepsToTheNeighbouringStages() {
        assertThat(Level.A0.next()).contains(Level.A1_1);
        assertThat(Level.A1_3.next()).contains(Level.A2_1);
        assertThat(Level.B1_1.previous()).contains(Level.A2_3);
    }

    @Test
    void hasNoStageBeyondTheEnds() {
        assertThat(Level.C2_3.next()).isEmpty();
        assertThat(Level.A0.previous()).isEmpty();
    }

    @Test
    void comparesByLearningOrder() {
        assertThat(Level.B2_1.isAbove(Level.B1_3)).isTrue();
        assertThat(Level.A1_2.isAbove(Level.A1_3)).isFalse();
        assertThat(Level.A1_2.isAbove(Level.A1_2)).isFalse();
        assertThat(List.of(Level.C1_1, Level.A0, Level.A2_2).stream().sorted()).containsExactly(Level.A0, Level.A2_2, Level.C1_1);
    }

    @Test
    void mapsEachStageToItsCefrBand() {
        assertThat(Level.A0.band()).isEqualTo(CefrBand.A0);
        assertThat(Level.A1_3.band()).isEqualTo(CefrBand.A1);
        assertThat(Level.B2_2.band()).isEqualTo(CefrBand.B2);
        assertThat(Level.C2_1.band()).isEqualTo(CefrBand.C2);
        assertThat(Arrays.stream(Level.values()).filter(level -> level.band() == CefrBand.B1)).hasSize(3);
    }
}
