package app.lumastar.core.mastery;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import app.lumastar.domain.SkillArea;
import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillMastery.Entry;
import app.lumastar.domain.SkillTag;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import org.junit.jupiter.api.Test;

class AreaMasteryTest {

    private static final Instant PRACTISED = Instant.parse("2026-10-01T08:00:00Z");

    @Test
    void averagesTheTagsOfEachAreaInTheOrderOfTheAreas() {
        SkillMastery mastery = new SkillMastery(Map.of(
                SkillTag.of("vocab.family"), new Entry(0.8, 10, 8, PRACTISED),
                SkillTag.of("vocab.food"), new Entry(0.4, 5, 2, PRACTISED),
                SkillTag.of("grammar.case"), new Entry(0.5, 4, 2, PRACTISED),
                SkillTag.of("spelling.nasal_vowels"), new Entry(0.9, 0, 0, null)));

        List<AreaMastery> areas = AreaMastery.of(mastery);

        assertThat(areas).extracting(AreaMastery::area).containsExactly(SkillArea.values());
        assertThat(areas.get(0).skillTags()).isEqualTo(2);
        assertThat(areas.get(0).average().getAsDouble()).isCloseTo(0.6, within(1e-9));
        assertThat(areas.get(2)).isEqualTo(new AreaMastery(SkillArea.GRAMMAR, 1, OptionalDouble.of(0.5)));
        assertThat(areas.get(3).average()).as("an estimate of the placement test counts too").hasValue(0.9);
    }

    @Test
    void anAreaWithoutTagsHasNoAverage() {
        List<AreaMastery> areas = AreaMastery.of(new SkillMastery(Map.of()));

        assertThat(areas).allSatisfy(area -> {
            assertThat(area.skillTags()).isZero();
            assertThat(area.average()).isEmpty();
        });
    }

    @Test
    void theAreasHaveTheirGermanNames() {
        assertThat(List.of(SkillArea.values())).extracting(SkillArea::label)
                .containsExactly("Wortschatz", "Wendungen", "Grammatik", "Schreiben", "Lesen");
    }
}
