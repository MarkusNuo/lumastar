package app.lumastar.core.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.domain.LearnerProfile;
import app.lumastar.domain.Level;
import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillTag;
import app.lumastar.domain.SkillTagErrorRate;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class WeakSpotsTest {

    private static final LearnerProfile LEARNER = new LearnerProfile(UUID.randomUUID(), "Erza", Set.of(), 10, Level.A1_2, 0);
    private static final SkillTag CASES = SkillTag.of("grammar.case");
    private static final SkillTag CLITICS = SkillTag.of("grammar.clitics");
    private static final SkillTag NUMBERS = SkillTag.of("vocab.numbers");
    private static final SkillTag FAMILY = SkillTag.of("vocab.family");
    private static final SkillTag HOME = SkillTag.of("vocab.home");

    @Test
    void ranksTheTagsWithMostRecentErrorsFirstThenTheLowestMastery() {
        LessonContext context = new LessonContext(LEARNER,
                mastery(Map.of(NUMBERS, 0.5, FAMILY, 0.2, HOME, 0.85, CASES, 0.1)),
                List.of(), List.of(new SkillTagErrorRate(CLITICS, 10, 3), new SkillTagErrorRate(CASES, 4, 4),
                        new SkillTagErrorRate(HOME, 20, 0)), Set.of(), List.of());

        assertThat(WeakSpots.rank(context, 10)).containsExactly(CASES, CLITICS, FAMILY, NUMBERS);
        assertThat(WeakSpots.rank(context, 2)).containsExactly(CASES, CLITICS);
    }

    @Test
    void breaksTiesByTheErrorRateAndThenTheTag() {
        LessonContext context = new LessonContext(LEARNER, mastery(Map.of()), List.of(),
                List.of(new SkillTagErrorRate(NUMBERS, 10, 3), new SkillTagErrorRate(FAMILY, 5, 3),
                        new SkillTagErrorRate(HOME, 5, 3)), Set.of(), List.of());

        assertThat(WeakSpots.rank(context, 5)).containsExactly(FAMILY, HOME, NUMBERS);
    }

    @Test
    void aLearnerWithoutWeakSpotsHasNone() {
        assertThat(WeakSpots.rank(LessonContext.firstLesson(LEARNER), 5)).isEmpty();
    }

    private static SkillMastery mastery(Map<SkillTag, Double> values) {
        Map<SkillTag, SkillMastery.Entry> entries = new HashMap<>();
        values.forEach((tag, value) -> entries.put(tag, new SkillMastery.Entry(value, 8, 4, Instant.parse("2026-10-01T10:00:00Z"))));
        return new SkillMastery(entries);
    }
}
