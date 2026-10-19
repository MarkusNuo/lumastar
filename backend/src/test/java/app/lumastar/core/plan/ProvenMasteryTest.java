package app.lumastar.core.plan;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillMastery.Entry;
import app.lumastar.domain.SkillTag;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProvenMasteryTest {

    private static final SkillTag FOOD = SkillTag.of("vocab.food");
    private static final SkillTag HOME = SkillTag.of("vocab.home");
    private static final SkillTag CASES = SkillTag.of("grammar.case");
    private static final SkillTag NUMBERS = SkillTag.of("vocab.numbers");
    private static final Instant PRACTISED = Instant.parse("2026-10-01T10:00:00Z");

    @Test
    void keepsOnlyTagsWithEightFirstAnswersFromTwoLessons() {
        SkillMastery mastery = new SkillMastery(Map.of(
                FOOD, new Entry(0.92, 8, 8, PRACTISED),
                HOME, new Entry(0.95, 7, 7, PRACTISED),
                CASES, new Entry(0.9, 12, 11, PRACTISED),
                NUMBERS, new Entry(0.9, 0, 0, null)));

        SkillMastery proven = ProvenMastery.of(mastery, Map.of(FOOD, 2, HOME, 3, CASES, 1));

        assertThat(proven.entries()).containsOnlyKeys(FOOD);
        assertThat(proven.entries().get(FOOD)).isEqualTo(mastery.entries().get(FOOD));
    }

    @Test
    void aPlacementEstimateAloneIsNoProof() {
        SkillMastery placed = new SkillMastery(Map.of(NUMBERS, new Entry(0.9, 0, 0, null)));

        assertThat(ProvenMastery.of(placed, Map.of(NUMBERS, 5)).entries()).isEmpty();
    }
}
