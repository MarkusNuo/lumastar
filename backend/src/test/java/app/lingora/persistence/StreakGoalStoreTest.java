package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
import app.lingora.core.progress.StreakGoal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

class StreakGoalStoreTest extends IntegrationTest {

    private static final Instant NOW = Instant.parse("2026-10-08T17:00:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 8);

    @Autowired
    private StreakGoalStore goals;

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
    void everyLearnerStartsWithTheFirstGoalWithoutARow() {
        assertThat(goals.goal(arta)).isEqualTo(StreakGoal.FIRST);
        assertThat(jdbc.sql("SELECT count(*) FROM streak_goals").query(Integer.class).single()).isZero();
    }

    @Test
    void storesTheReachedGoalAndThenTheChosenOneOfEachLearner() {
        goals.markReached(arta, new StreakGoal(10, TODAY), NOW);
        assertThat(goals.goal(arta)).isEqualTo(new StreakGoal(10, TODAY));
        assertThat(jdbc.sql("SELECT reached_at FROM streak_goals WHERE user_id = :user").param("user", arta)
                .query(Instant.class).single()).isEqualTo(NOW);

        goals.choose(arta, 30, NOW.plusSeconds(60));
        goals.choose(bora, 50, NOW);

        assertThat(goals.goal(arta)).isEqualTo(StreakGoal.chosen(30));
        assertThat(goals.goal(bora)).isEqualTo(StreakGoal.chosen(50));
        assertThat(jdbc.sql("SELECT count(*) FROM streak_goals WHERE reached_at IS NULL").query(Integer.class).single())
                .isEqualTo(2);
    }

    @ParameterizedTest
    @ValueSource(ints = {10, 75, 300, 365, 465, 1065})
    void theDatabaseAcceptsTheRungsOfTheLadder(int target) {
        insert(target);

        assertThat(goals.goal(arta).target()).isEqualTo(target);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 5, 11, 40, 360, 366, 400, 415})
    void theDatabaseRejectsTargetsOffTheLadderSoThatNoImportCanStoreThem(int target) {
        assertThatThrownBy(() -> insert(target)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void aGoalIsDeletedWithItsLearner() {
        goals.choose(arta, 20, NOW);

        jdbc.sql("DELETE FROM users WHERE id = :user").param("user", arta).update();

        assertThat(jdbc.sql("SELECT count(*) FROM streak_goals").query(Integer.class).single()).isZero();
    }

    private void insert(int target) {
        jdbc.sql("INSERT INTO streak_goals (user_id, target, updated_at) VALUES (:user, :target, now())")
                .param("user", arta)
                .param("target", target)
                .update();
    }
}
