package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
import app.lingora.persistence.StreakStore.StreakDay;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class StreakStoreTest extends IntegrationTest {

    private static final Instant NOW = Instant.parse("2026-10-08T17:00:00Z");
    /** Thursday, 1 October 2026. */
    private static final LocalDate OCTOBER_1 = LocalDate.of(2026, 10, 1);

    @Autowired
    private StreakStore streaks;

    private UUID arta;
    private UUID bora;

    @BeforeEach
    void twoLearners() {
        jdbc.sql("DELETE FROM users").update();
        LearnerFixture fixture = new LearnerFixture(jdbc);
        arta = fixture.learner("Arta");
        bora = fixture.learner("Bora");
    }

    @Test
    void theDaysAndTheLastFrozenDayOnlyReadTheLearnersOwnDays() {
        met(arta, OCTOBER_1);
        streaks.recordFreeze(arta, OCTOBER_1.plusDays(1), NOW);
        met(arta, OCTOBER_1.plusDays(2));
        met(bora, OCTOBER_1.plusDays(1));
        met(bora, OCTOBER_1.plusDays(2));
        streaks.recordFreeze(bora, OCTOBER_1.plusDays(5), NOW);

        assertThat(streaks.days(arta, OCTOBER_1, OCTOBER_1.plusDays(5))).extracting(StreakDay::day, StreakDay::kind)
                .containsExactly(tuple(OCTOBER_1, StreakDayKind.GOAL_MET), tuple(OCTOBER_1.plusDays(1), StreakDayKind.FREEZE),
                        tuple(OCTOBER_1.plusDays(2), StreakDayKind.GOAL_MET));
        assertThat(streaks.days(bora, OCTOBER_1, OCTOBER_1.plusDays(2))).extracting(StreakDay::day)
                .containsExactly(OCTOBER_1.plusDays(1), OCTOBER_1.plusDays(2));
        assertThat(streaks.lastFrozenDay(arta)).contains(OCTOBER_1.plusDays(1));
        assertThat(streaks.lastFrozenDay(bora)).contains(OCTOBER_1.plusDays(5));
    }

    @Test
    void thereIsNoLastFrozenDayBeforeTheFirstFreeze() {
        met(arta, OCTOBER_1);

        assertThat(streaks.lastFrozenDay(arta)).isEmpty();
    }

    private void met(UUID learner, LocalDate day) {
        streaks.recordGoalMet(learner, day, 10, PracticeCompletion.NONE, NOW);
    }
}
