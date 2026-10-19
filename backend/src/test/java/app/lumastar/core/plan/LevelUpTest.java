package app.lumastar.core.plan;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.domain.Level;
import app.lumastar.domain.LevelBadge;
import org.junit.jupiter.api.Test;

class LevelUpTest {

    @Test
    void movesOnToTheNextStage() {
        LevelUp levelUp = LevelUp.afterCheckpoint(Level.A1_2, Level.A1_2);

        assertThat(levelUp.to()).isEqualTo(Level.A1_3);
        assertThat(levelUp.changesLevel()).isTrue();
        assertThat(levelUp.badges()).isEmpty();
    }

    @Test
    void completingABandEarnsItsBadge() {
        LevelUp levelUp = LevelUp.afterCheckpoint(Level.A1_3, Level.A1_3);

        assertThat(levelUp.to()).isEqualTo(Level.A2_1);
        assertThat(levelUp.badges()).containsExactly(LevelBadge.A1);
    }

    @Test
    void theBeginnerStageHasNoBadge() {
        LevelUp levelUp = LevelUp.afterCheckpoint(Level.A0, Level.A0);

        assertThat(levelUp.to()).isEqualTo(Level.A1_1);
        assertThat(levelUp.badges()).isEmpty();
    }

    @Test
    void aCheckpointAheadEarnsTheBadgesOfEveryBandItCompletes() {
        LevelUp levelUp = LevelUp.afterCheckpoint(Level.A1_1, Level.A2_3);

        assertThat(levelUp.to()).isEqualTo(Level.B1_1);
        assertThat(levelUp.badges()).containsExactly(LevelBadge.A1, LevelBadge.A2);
    }

    @Test
    void theLastStageCompletesC2WithoutANewLevel() {
        LevelUp levelUp = LevelUp.afterCheckpoint(Level.C2_3, Level.C2_3);

        assertThat(levelUp.to()).isEqualTo(Level.C2_3);
        assertThat(levelUp.changesLevel()).isFalse();
        assertThat(levelUp.badges()).containsExactly(LevelBadge.C2);
    }

    @Test
    void neverMovesTheLearnerDown() {
        LevelUp levelUp = LevelUp.afterCheckpoint(Level.B1_1, Level.A1_2);

        assertThat(levelUp.to()).isEqualTo(Level.B1_1);
        assertThat(levelUp.changesLevel()).isFalse();
        assertThat(levelUp.badges()).isEmpty();
    }
}
