package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
import app.lingora.content.ContentFixture;
import app.lingora.content.ContentLoader;
import app.lingora.content.ContentSeeder;
import app.lingora.domain.Outcome;
import app.lingora.domain.SkillMastery.Entry;
import app.lingora.domain.SkillTag;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class SkillMasteryStoreTest extends IntegrationTest {

    private static final Instant NOW = Instant.parse("2026-09-25T10:00:00Z");
    private static final SkillTag FAMILY = SkillTag.of("vocab.family");
    private static final SkillTag ARTICLE = SkillTag.of("grammar.definite_article.fem");
    private static final SkillTag HOME = SkillTag.of("vocab.home");

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    @Autowired
    private SkillMasteryStore store;

    private UUID learner;

    @BeforeEach
    void learner() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(loader.load(ContentFixture.path()));
        learner = new LearnerFixture(jdbc).learner("Erza");
    }

    @Test
    void recordsAnAnswerForEveryTagAndBuildsOnThePreviousValue() {
        store.recordAnswer(learner, List.of(FAMILY, ARTICLE), Outcome.CORRECT, false, NOW);
        store.recordAnswer(learner, List.of(ARTICLE), Outcome.WRONG, false, NOW.plusSeconds(10));

        Map<SkillTag, Entry> raw = store.raw(learner).entries();

        assertThat(raw.get(FAMILY)).isEqualTo(new Entry(0.5, 1, 1, NOW));
        // ten seconds of decay are negligible
        assertThat(raw.get(ARTICLE).mastery()).isCloseTo(0.5 - 0.5 / 3, within(1e-5));
        assertThat(raw.get(ARTICLE).attempts()).isEqualTo(2);
        assertThat(raw.get(ARTICLE).correct()).isEqualTo(1);
        assertThat(raw.get(ARTICLE).lastPracticed()).isEqualTo(NOW.plusSeconds(10));
    }

    @Test
    void keepsTheMasteryOfEachLearnerApart() {
        UUID other = new LearnerFixture(jdbc).learner("Arta");

        store.recordAnswer(other, List.of(FAMILY), Outcome.CORRECT, false, NOW);

        assertThat(store.raw(learner).entries()).isEmpty();
        assertThat(store.raw(other).entries()).containsOnlyKeys(FAMILY);
    }

    @Test
    void decaysOnReadButStoresTheRawValue() {
        store.recordAnswer(learner, List.of(FAMILY), Outcome.CORRECT, false, NOW);

        assertThat(store.effective(learner, NOW.plus(Duration.ofDays(60))).entries().get(FAMILY).mastery())
                .isCloseTo(0.25, within(1e-9));
        assertThat(store.raw(learner).entries().get(FAMILY).mastery()).isEqualTo(0.5);
    }

    @Test
    void seedsInitialEstimatesOnlyForTagsThatHaveNotBeenPractised() {
        store.recordAnswer(learner, List.of(FAMILY), Outcome.WRONG, false, NOW);

        store.seedInitial(learner, Map.of(FAMILY, 0.9, HOME, 0.7), NOW);
        store.seedInitial(learner, Map.of(HOME, 0.6), NOW);

        Map<SkillTag, Entry> raw = store.raw(learner).entries();
        assertThat(raw.get(FAMILY)).isEqualTo(new Entry(0, 1, 0, NOW));
        assertThat(raw.get(HOME)).isEqualTo(new Entry(0.6, 0, 0, null));
    }

    @Test
    void theFirstAnswerMovesAnEstimateHalfway() {
        store.seedInitial(learner, Map.of(HOME, 0.6), NOW);

        store.recordAnswer(learner, List.of(HOME), Outcome.CORRECT, false, NOW);

        Entry home = store.raw(learner).entries().get(HOME);
        assertThat(home.mastery()).isCloseTo(0.8, within(1e-9));
        assertThat(home.attempts()).isEqualTo(1);
        assertThat(home.lastPracticed()).isEqualTo(NOW);
    }
}
