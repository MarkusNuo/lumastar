package app.lingora.core.progress;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.lingora.core.progress.StreakRule.Extension;
import java.time.LocalDate;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class StreakRuleTest {

    /** Monday of ISO week 41 of 2026. */
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);
    private static final LocalDate TUESDAY = MONDAY.plusDays(1);
    private static final LocalDate WEDNESDAY = MONDAY.plusDays(2);
    private static final LocalDate THURSDAY = MONDAY.plusDays(3);
    private static final LocalDate FRIDAY = MONDAY.plusDays(4);
    private static final LocalDate SATURDAY = MONDAY.plusDays(5);
    private static final LocalDate SUNDAY = MONDAY.plusDays(6);
    private static final LocalDate NEXT_MONDAY = MONDAY.plusWeeks(1);

    @Nested
    class MeetingTheGoal {

        @Test
        void startsAStreakOfOneDay() {
            Extension extension = StreakRule.extend(Streak.NONE, MONDAY);

            assertThat(extension.extended()).isTrue();
            assertThat(extension.streak()).isEqualTo(new Streak(1, 1, MONDAY, null, 1));
            assertThat(extension.bridgedDay()).isEmpty();
        }

        @Test
        void onTheNextDayExtendsTheStreak() {
            Streak streak = met(MONDAY, TUESDAY, WEDNESDAY);

            assertThat(streak.current()).isEqualTo(3);
            assertThat(streak.longest()).isEqualTo(3);
            assertThat(streak.lastActiveDate()).isEqualTo(WEDNESDAY);
        }

        @Test
        void extendsTheStreakOncePerDay() {
            Streak streak = met(MONDAY);

            Extension again = StreakRule.extend(streak, MONDAY);

            assertThat(again.extended()).isFalse();
            assertThat(again.streak()).isEqualTo(streak);
        }

        @Test
        void afterTheTimeZoneMovedWestTheLaterDayStillCountsAsToday() {
            Streak streak = met(TUESDAY);

            assertThat(StreakRule.extend(streak, MONDAY).extended()).isFalse();
            assertThat(StreakRule.status(streak, MONDAY).extendedToday()).isTrue();
        }

        @Test
        void keepsTheLongestStreakWhenANewOneStarts() {
            Streak streak = met(MONDAY, TUESDAY, WEDNESDAY, SATURDAY);

            assertThat(streak.current()).isEqualTo(1);
            assertThat(streak.longest()).isEqualTo(3);
        }
    }

    @Nested
    class MissingDays {

        @Test
        void aSingleMissedDayIsBridgedByTheWeeklyFreeze() {
            Streak streak = met(MONDAY);

            Extension extension = StreakRule.extend(streak, WEDNESDAY);

            assertThat(extension.streak().current()).isEqualTo(2);
            assertThat(extension.bridgedDay()).contains(TUESDAY);
            assertThat(extension.streak().freezesLeft(WEDNESDAY)).isZero();
        }

        @Test
        void whileTheMissedDayIsBridgedTheStreakStandsAndTheFreezeIsTaken() {
            StreakRule.Status status = StreakRule.status(met(MONDAY), WEDNESDAY);

            assertThat(status.current()).isEqualTo(1);
            assertThat(status.bridgesYesterday()).isTrue();
            assertThat(status.freezesLeft()).isZero();
            assertThat(status.extendedToday()).isFalse();
        }

        @Test
        void twoMissedDaysInARowEndTheStreak() {
            Streak streak = met(MONDAY, TUESDAY);

            assertThat(StreakRule.status(streak, FRIDAY).current()).isZero();
            Extension restart = StreakRule.extend(streak, FRIDAY);
            assertThat(restart.streak().current()).isEqualTo(1);
            assertThat(restart.streak().longest()).isEqualTo(2);
            assertThat(restart.bridgedDay()).isEmpty();
        }

        @Test
        void aFreezeThatCannotSaveTheStreakIsNotUsedUp() {
            Streak streak = met(MONDAY);

            Extension restart = StreakRule.extend(streak, THURSDAY);

            assertThat(restart.streak().freezesLeft(THURSDAY)).isEqualTo(1);
            assertThat(StreakRule.status(streak, THURSDAY).freezesLeft()).isEqualTo(1);
        }

        @Test
        void onlyOneMissedDayPerIsoWeekIsBridged() {
            Streak streak = met(MONDAY, WEDNESDAY, THURSDAY);

            assertThat(streak.current()).isEqualTo(3);
            assertThat(StreakRule.status(streak, SATURDAY).current()).isZero();
            assertThat(StreakRule.extend(streak, SATURDAY).streak().current()).isEqualTo(1);
        }

        @Test
        void theFreezeOfTheMissedDaysWeekBridgesIt() {
            Streak streak = met(SATURDAY);

            Extension extension = StreakRule.extend(streak, NEXT_MONDAY);

            assertThat(extension.bridgedDay()).contains(SUNDAY);
            assertThat(extension.streak().current()).isEqualTo(2);
            assertThat(extension.streak().freezesLeft(SUNDAY)).isZero();
            assertThat(extension.streak().freezesLeft(NEXT_MONDAY)).isEqualTo(1);
        }

        @Test
        void aNewIsoWeekBringsTheFreezeBack() {
            Streak streak = met(MONDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY, NEXT_MONDAY);

            Extension extension = StreakRule.extend(streak, NEXT_MONDAY.plusDays(2));

            assertThat(extension.bridgedDay()).contains(NEXT_MONDAY.plusDays(1));
            assertThat(extension.streak().current()).isEqualTo(8);
        }

        @Test
        void unusedFreezesAreNotCarriedOver() {
            Streak streak = met(MONDAY);

            assertThat(streak.freezesLeft(MONDAY.plusWeeks(5))).isEqualTo(StreakRule.FREEZES_PER_WEEK);
        }

        @Test
        void isoWeeksRunAcrossTheTurnOfTheYear() {
            LocalDate tuesday = LocalDate.of(2026, 12, 29);
            Streak streak = met(LocalDate.of(2026, 12, 28), LocalDate.of(2026, 12, 30), LocalDate.of(2026, 12, 31));

            assertThat(streak.current()).isEqualTo(3);
            assertThat(streak.freezeWeek()).isEqualTo(tuesday.minusDays(1));
            assertThat(StreakRule.extend(streak, LocalDate.of(2027, 1, 2)).streak().current())
                    .as("1 January 2027 is in the ISO week of 28 December 2026, whose freeze is used")
                    .isEqualTo(1);
        }
    }

    @Nested
    class JudgingTheStreak {

        @Test
        void isEmptyBeforeTheGoalWasEverMet() {
            assertThat(StreakRule.status(Streak.NONE, MONDAY))
                    .isEqualTo(new StreakRule.Status(0, 0, 1, false, null, false));
        }

        @Test
        void onTheDayAfterTheStreakStillStandsButIsNotExtendedYet() {
            StreakRule.Status status = StreakRule.status(met(MONDAY, TUESDAY), WEDNESDAY);

            assertThat(status).isEqualTo(new StreakRule.Status(2, 2, 1, false, TUESDAY, false));
        }

        @Test
        void onTheDayItWasExtended() {
            assertThat(StreakRule.status(met(MONDAY, TUESDAY), TUESDAY).extendedToday()).isTrue();
        }

        @Test
        void anEndedStreakKeepsItsLongestAndLastActiveDay() {
            StreakRule.Status status = StreakRule.status(met(MONDAY, TUESDAY), SATURDAY);

            assertThat(status).isEqualTo(new StreakRule.Status(0, 2, 1, false, TUESDAY, false));
        }
    }

    @Nested
    class TheStreakBeforeACompletion {

        @Test
        void isOneDayShorterWhenTheCompletionExtendedTheStreakToday() {
            assertThat(StreakRule.status(met(MONDAY, TUESDAY), TUESDAY).before(TUESDAY)).isOne();
        }

        @Test
        void comesFromTheStoredStreakNotFromRecordedDays() {
            Streak imported = new Streak(9, 12, TUESDAY, null, 1);

            assertThat(StreakRule.status(StreakRule.extend(imported, WEDNESDAY).streak(), WEDNESDAY).before(WEDNESDAY))
                    .isEqualTo(9);
        }

        @Test
        void staysOneDayShorterWhileTheCompletionsDayIsTheLastOfTheStreak() {
            assertThat(StreakRule.status(met(MONDAY, TUESDAY), WEDNESDAY).before(TUESDAY)).isOne();
            assertThat(StreakRule.status(met(MONDAY, TUESDAY), THURSDAY).before(TUESDAY)).as("bridged by the freeze").isOne();
        }

        @Test
        void isTheStreakItselfOnceALaterDayExtendedIt() {
            assertThat(StreakRule.status(met(MONDAY, TUESDAY), TUESDAY).before(MONDAY)).isEqualTo(2);
        }

        @Test
        void isNothingOnceTheStreakHasEnded() {
            assertThat(StreakRule.status(met(MONDAY, TUESDAY), SATURDAY).before(TUESDAY)).isZero();
            assertThat(StreakRule.status(Streak.NONE, MONDAY).before(MONDAY)).isZero();
        }
    }

    @Nested
    class FreezeReset {

        @ParameterizedTest(name = "{0} → {1}")
        @CsvSource(delimiter = '|', textBlock = """
                2026-10-05 | 2026-10-12
                2026-10-06 | 2026-10-12
                2026-10-07 | 2026-10-12
                2026-10-08 | 2026-10-12
                2026-10-09 | 2026-10-12
                2026-10-10 | 2026-10-12
                2026-10-11 | 2026-10-12
                2026-12-28 | 2027-01-04""")
        void theNextFreezeComesOnTheMondayAfterToday(LocalDate today, LocalDate resetsOn) {
            assertThat(StreakRule.freezesResetOn(today)).isEqualTo(resetsOn);
        }

        @Test
        void onAMondayItIsTheMondayOfTheNextWeek() {
            assertThat(StreakRule.freezesResetOn(MONDAY)).isEqualTo(NEXT_MONDAY);
            assertThat(StreakRule.freezesResetOn(SUNDAY)).isEqualTo(NEXT_MONDAY);
        }
    }

    @Nested
    class Validation {

        @Test
        void rejectsAFreezeWeekThatDoesNotStartOnMonday() {
            assertThatIllegalArgumentException().isThrownBy(() -> new Streak(1, 1, MONDAY, TUESDAY, 0));
        }

        @Test
        void rejectsMoreFreezesThanAWeekHas() {
            assertThatIllegalArgumentException().isThrownBy(() -> new Streak(1, 1, MONDAY, MONDAY, 2));
        }

        @Test
        void rejectsAStreakLongerThanTheLongest() {
            assertThatIllegalArgumentException().isThrownBy(() -> new Streak(3, 2, MONDAY, null, 1));
        }
    }

    /** The streak after the goal was met on each of the days, in order. */
    private static Streak met(LocalDate... days) {
        Streak streak = Streak.NONE;
        for (LocalDate day : days) {
            streak = StreakRule.extend(streak, day).streak();
        }
        return streak;
    }
}
