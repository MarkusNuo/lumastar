package app.lingora.core.progress;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.lingora.core.progress.StreakGoalRule.Status;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class StreakGoalRuleTest {

    private static final LocalDate DAY = LocalDate.of(2026, 10, 14);
    private static final LocalDate EARLIER = DAY.minusDays(5);

    @Test
    void aGoalIsARungOfTheLadder() {
        assertThatIllegalArgumentException().isThrownBy(() -> StreakGoal.chosen(25)).withMessageContaining("25");
        assertThatIllegalArgumentException().isThrownBy(() -> new StreakGoal(0, null));
    }

    @Nested
    class Progress {

        @Test
        void aGoalAheadShowsTheStreakAsProgressAndOffersNothing() {
            assertThat(StreakGoalRule.status(StreakGoal.FIRST, 0)).isEqualTo(new Status(10, 0, false, List.of()));
            assertThat(StreakGoalRule.status(StreakGoal.FIRST, 9)).isEqualTo(new Status(10, 9, false, List.of()));
        }

        @Test
        void aReachedGoalIsCompleteAndOffersTheNextThreeRungs() {
            assertThat(StreakGoalRule.status(new StreakGoal(10, DAY), 10))
                    .isEqualTo(new Status(10, 10, true, List.of(20, 30, 50)));
            assertThat(StreakGoalRule.status(new StreakGoal(20, DAY), 20))
                    .isEqualTo(new Status(20, 20, true, List.of(30, 50, 75)));
            assertThat(StreakGoalRule.status(new StreakGoal(50, DAY), 50))
                    .isEqualTo(new Status(50, 50, true, List.of(75, 100, 150)));
        }

        @Test
        void theProgressNeverExceedsTheTarget() {
            assertThat(StreakGoalRule.status(new StreakGoal(10, EARLIER), 14).progress()).isEqualTo(10);
        }

        @Test
        void aStreakThatRanPastFurtherRungsBeforeTheChoiceOnlyGetsGoalsAheadOfIt() {
            assertThat(StreakGoalRule.status(new StreakGoal(10, EARLIER), 24).options()).containsExactly(30, 50, 75);
            assertThat(StreakGoalRule.status(new StreakGoal(10, EARLIER), 30).options()).containsExactly(50, 75, 100);
        }

        @Test
        void aReachedGoalStaysReachedWhenTheStreakBreaksUntilTheNextIsChosen() {
            assertThat(StreakGoalRule.status(new StreakGoal(10, EARLIER), 0))
                    .isEqualTo(new Status(10, 0, true, List.of(20, 30, 50)));
        }

        @Test
        void aBrokenStreakKeepsTheGoalAndStartsItsProgressAgain() {
            assertThat(StreakGoalRule.status(StreakGoal.chosen(30), 1)).isEqualTo(new Status(30, 1, false, List.of()));
        }

        @Test
        void aStreakAsLongAsAGoalNotMarkedReachedYetCountsAsReached() {
            assertThat(StreakGoalRule.status(StreakGoal.FIRST, 12))
                    .isEqualTo(new Status(10, 10, true, List.of(20, 30, 50)));
        }
    }

    @Nested
    class Reaching {

        @Test
        void theExtensionToTheTargetReachesTheGoalOnItsDay() {
            assertThat(StreakGoalRule.reachedBy(StreakGoal.FIRST, 10, DAY)).contains(new StreakGoal(10, DAY));
        }

        @Test
        void anExtensionBelowTheTargetReachesNothing() {
            assertThat(StreakGoalRule.reachedBy(StreakGoal.FIRST, 9, DAY)).isEmpty();
            assertThat(StreakGoalRule.reachedBy(StreakGoal.chosen(30), 1, DAY)).isEmpty();
        }

        @Test
        void aGoalIsReachedOnlyOnce() {
            assertThat(StreakGoalRule.reachedBy(new StreakGoal(10, EARLIER), 11, DAY)).isEmpty();
        }

        @Test
        void aStreakThatWasLongerAlreadyReachesTheGoalWithItsNextExtension() {
            assertThat(StreakGoalRule.reachedBy(StreakGoal.FIRST, 16, DAY)).contains(new StreakGoal(10, DAY));
        }

        @Test
        void aStreakCarriedOverAFrozenDayReachesItsGoalLikeAnyOther() {
            Streak nineDays = new Streak(9, 9, DAY.minusDays(2), null, 1);

            StreakRule.Extension bridged = StreakRule.extend(nineDays, DAY);

            assertThat(bridged.bridgedDay()).contains(DAY.minusDays(1));
            assertThat(StreakGoalRule.reachedBy(StreakGoal.FIRST, bridged.streak().current(), DAY))
                    .contains(new StreakGoal(10, DAY));
        }
    }

    @Nested
    class Choosing {

        @ParameterizedTest
        @ValueSource(ints = {20, 30, 50})
        void aReachedGoalAcceptsItsOptions(int target) {
            assertThat(StreakGoalRule.mayChoose(new StreakGoal(10, DAY), 10, target)).isTrue();
        }

        @ParameterizedTest
        @ValueSource(ints = {10, 75, 100, 25, 0})
        void aReachedGoalRefusesAnythingElse(int target) {
            assertThat(StreakGoalRule.mayChoose(new StreakGoal(10, DAY), 10, target)).isFalse();
        }

        @ParameterizedTest
        @ValueSource(ints = {10, 20, 50, 365, 465})
        void beforeItIsReachedTheGoalMayBeChangedToAnyRungAboveTheStreak(int target) {
            assertThat(StreakGoalRule.mayChoose(StreakGoal.chosen(30), 8, target)).isTrue();
        }

        @ParameterizedTest
        @ValueSource(ints = {20, 10, 25, 366, -10})
        void beforeItIsReachedTheGoalRefusesRungsNotAboveTheStreakAndLengthsOffTheLadder(int target) {
            assertThat(StreakGoalRule.mayChoose(StreakGoal.chosen(30), 20, target)).as("%d days", target).isFalse();
        }

        @Test
        void aBrokenStreakAfterAReachedGoalStillOnlyOffersTheOptions() {
            assertThat(StreakGoalRule.mayChoose(new StreakGoal(20, EARLIER), 0, 30)).isTrue();
            assertThat(StreakGoalRule.mayChoose(new StreakGoal(20, EARLIER), 0, 10)).isFalse();
        }
    }
}
