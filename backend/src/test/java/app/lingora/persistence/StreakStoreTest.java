package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
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
    void theLengthOnADayCountsTheMetDaysOfTheUnbrokenRunEndingOnIt() {
        met(arta, OCTOBER_1.minusDays(2));
        met(arta, OCTOBER_1);
        met(arta, OCTOBER_1.plusDays(1));
        streaks.recordFreeze(arta, OCTOBER_1.plusDays(2), NOW);
        met(arta, OCTOBER_1.plusDays(3));
        met(arta, OCTOBER_1.plusDays(4));

        assertThat(streaks.lengthOn(arta, OCTOBER_1.minusDays(2))).isOne();
        assertThat(streaks.lengthOn(arta, OCTOBER_1)).as("the missed day before ended the earlier run").isOne();
        assertThat(streaks.lengthOn(arta, OCTOBER_1.plusDays(1))).isEqualTo(2);
        assertThat(streaks.lengthOn(arta, OCTOBER_1.plusDays(3))).as("a frozen day carries the run on").isEqualTo(3);
        assertThat(streaks.lengthOn(arta, OCTOBER_1.plusDays(4))).isEqualTo(4);
        assertThat(streaks.lengthOn(arta, OCTOBER_1.plusDays(5))).as("no day recorded").isZero();
    }

    @Test
    void theLengthAndTheLastFrozenDayOnlyReadTheLearnersOwnDays() {
        met(arta, OCTOBER_1);
        streaks.recordFreeze(arta, OCTOBER_1.plusDays(1), NOW);
        met(arta, OCTOBER_1.plusDays(2));
        met(bora, OCTOBER_1.plusDays(1));
        met(bora, OCTOBER_1.plusDays(2));
        streaks.recordFreeze(bora, OCTOBER_1.plusDays(5), NOW);

        assertThat(streaks.lengthOn(arta, OCTOBER_1.plusDays(2))).isEqualTo(2);
        assertThat(streaks.lengthOn(bora, OCTOBER_1.plusDays(2))).isEqualTo(2);
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
