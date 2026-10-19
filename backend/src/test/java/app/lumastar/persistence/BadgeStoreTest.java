package app.lumastar.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.LearnerFixture;
import app.lumastar.domain.LevelBadge;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class BadgeStoreTest extends IntegrationTest {

    private static final Instant NOW = Instant.parse("2026-10-07T10:00:00Z");

    @Autowired
    private BadgeStore badges;

    private LearnerFixture fixture;
    private UUID arta;
    private UUID bora;

    @BeforeEach
    void twoLearners() {
        jdbc.sql("DELETE FROM users").update();
        fixture = new LearnerFixture(jdbc);
        arta = fixture.learner("Arta");
        bora = fixture.learner("Bora");
    }

    @Test
    void theBadgesOfACheckpointAreOnlyThoseItAwardedTheLearner() {
        UUID checkpoint = fixture.lesson(arta, null, NOW);
        badges.award(arta, LevelBadge.A2, checkpoint, NOW);
        badges.award(arta, LevelBadge.A1, checkpoint, NOW);
        badges.award(bora, LevelBadge.B1, checkpoint, NOW);

        assertThat(badges.awardedBy(arta, checkpoint)).containsExactly(LevelBadge.A1, LevelBadge.A2);
        assertThat(badges.awardedBy(bora, fixture.lesson(bora, null, NOW))).isEmpty();
    }
}
