package app.lingora.core.reminder;

import static app.lingora.core.reminder.Reminder.DAILY_REMINDER;
import static app.lingora.core.reminder.Reminder.NONE;
import static app.lingora.core.reminder.Reminder.STREAK_AT_RISK;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.core.progress.Streak;
import app.lingora.core.progress.StreakRule;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ReminderPolicyTest {

    private static final ZoneId ZURICH = ZoneId.of("Europe/Zurich");
    /** Wednesday, 7 October 2026. */
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 7);
    private static final ReminderSettings ON = new ReminderSettings(true, LocalTime.of(19, 0), true, LocalTime.of(21, 30));
    private static final StreakRule.Status NO_STREAK = new StreakRule.Status(0, 0, 1, false, null, false);
    /** A streak of 12 days up to yesterday with this week's freeze left: missing today would be bridged. */
    private static final StreakRule.Status SAFE_STREAK = new StreakRule.Status(12, 12, 1, false, TODAY.minusDays(1), false);
    /** A streak of 12 days up to yesterday with this week's freeze used: missing today would end it. */
    private static final StreakRule.Status STREAK_AT_STAKE = new StreakRule.Status(12, 12, 0, false, TODAY.minusDays(1), false);

    private static ZonedDateTime at(String time) {
        return TODAY.atTime(LocalTime.parse(time)).atZone(ZURICH);
    }

    private static ReminderDay open(StreakRule.Status streak, SentReminder... sent) {
        return new ReminderDay(false, streak, List.of(sent));
    }

    private static SentReminder sent(Reminder kind) {
        return new SentReminder(kind, null);
    }

    @Nested
    class DailyReminder {

        @Test
        void comesAtTheLearnersTimeWhileTheGoalIsOpen() {
            assertThat(ReminderPolicy.decide(at("19:00"), ON, open(NO_STREAK))).isEqualTo(DAILY_REMINDER);
            assertThat(ReminderPolicy.decide(at("19:04"), ON, open(SAFE_STREAK))).isEqualTo(DAILY_REMINDER);
        }

        @Test
        void neverComesBeforeTheTime() {
            assertThat(ReminderPolicy.decide(at("18:59:59"), ON, open(NO_STREAK))).isEqualTo(NONE);
            assertThat(ReminderPolicy.decide(at("07:00"), ON, open(STREAK_AT_STAKE))).isEqualTo(NONE);
        }

        @Test
        void isSkippedWhenMoreThanAnHourLate() {
            assertThat(ReminderPolicy.decide(at("19:59:59"), ON, open(NO_STREAK))).isEqualTo(DAILY_REMINDER);
            assertThat(ReminderPolicy.decide(at("20:00"), ON, open(NO_STREAK))).isEqualTo(NONE);
        }

        @Test
        void comesOnceADay() {
            assertThat(ReminderPolicy.decide(at("19:05"), ON, open(NO_STREAK, sent(DAILY_REMINDER)))).isEqualTo(NONE);
        }

        @Test
        void neverComesOnceTheGoalIsMetOrTheStreakExtendedToday() {
            assertThat(ReminderPolicy.decide(at("19:00"), ON, new ReminderDay(true, NO_STREAK, List.of()))).isEqualTo(NONE);
            StreakRule.Status extendedToday = new StreakRule.Status(13, 13, 0, true, TODAY, false);
            assertThat(ReminderPolicy.decide(at("19:00"), ON, open(extendedToday)))
                    .as("the goal was met before it was raised").isEqualTo(NONE);
        }

        @Test
        void neverComesWhileRemindersAreOff() {
            ReminderSettings off = new ReminderSettings(false, LocalTime.of(19, 0), true, LocalTime.of(21, 30));

            assertThat(ReminderPolicy.decide(at("19:00"), off, open(NO_STREAK))).isEqualTo(NONE);
            assertThat(ReminderPolicy.decide(at("21:30"), off, open(STREAK_AT_STAKE))).isEqualTo(NONE);
        }

        @Test
        void comesAtMidnightAndJustBeforeIt() {
            ReminderSettings midnight = new ReminderSettings(true, LocalTime.MIDNIGHT, false, LocalTime.of(21, 30));
            ReminderSettings late = new ReminderSettings(true, LocalTime.of(23, 59), false, LocalTime.of(21, 30));

            assertThat(ReminderPolicy.decide(at("00:00"), midnight, open(NO_STREAK))).isEqualTo(DAILY_REMINDER);
            assertThat(ReminderPolicy.decide(at("23:59:30"), late, open(NO_STREAK))).isEqualTo(DAILY_REMINDER);
            assertThat(ReminderPolicy.decide(at("00:30"), late, open(NO_STREAK))).as("yesterday's time").isEqualTo(NONE);
        }
    }

    @Nested
    class StreakRescue {

        @Test
        void comesAtTheRescueTimeWhenMissingTodayWouldEndTheStreak() {
            assertThat(ReminderPolicy.decide(at("21:30"), ON, open(STREAK_AT_STAKE, sent(DAILY_REMINDER))))
                    .isEqualTo(STREAK_AT_RISK);
        }

        @Test
        void neverComesWhileTheWeeklyFreezeWouldBridgeToday() {
            assertThat(ReminderPolicy.decide(at("21:30"), ON, open(SAFE_STREAK, sent(DAILY_REMINDER)))).isEqualTo(NONE);
        }

        @Test
        void comesWhenTheFreezeAlreadyBridgesYesterday() {
            // Monday after a missed Sunday: the freeze of last week bridges Sunday, this week's freeze is left, but a
            // freeze bridges one missed day only.
            StreakRule.Status bridgingYesterday = new StreakRule.Status(5, 9, 1, false, TODAY.minusDays(2), true);

            assertThat(ReminderPolicy.decide(at("21:30"), ON, open(bridgingYesterday, sent(DAILY_REMINDER))))
                    .isEqualTo(STREAK_AT_RISK);
        }

        @Test
        void neverComesWithoutARunningStreak() {
            StreakRule.Status ended = new StreakRule.Status(0, 30, 0, false, TODAY.minusDays(5), false);

            assertThat(ReminderPolicy.decide(at("21:30"), ON, open(ended, sent(DAILY_REMINDER)))).isEqualTo(NONE);
        }

        @Test
        void comesOnceADayAndOnlyIfSwitchedOn() {
            ReminderSettings dailyOnly = new ReminderSettings(true, LocalTime.of(19, 0), false, LocalTime.of(21, 30));

            assertThat(ReminderPolicy.decide(at("21:35"), ON, open(STREAK_AT_STAKE, sent(DAILY_REMINDER), sent(STREAK_AT_RISK))))
                    .isEqualTo(NONE);
            assertThat(ReminderPolicy.decide(at("21:30"), dailyOnly, open(STREAK_AT_STAKE, sent(DAILY_REMINDER))))
                    .isEqualTo(NONE);
        }

        @Test
        void comesEvenIfTheDailyReminderWasMissed() {
            assertThat(ReminderPolicy.decide(at("21:30"), ON, open(STREAK_AT_STAKE))).isEqualTo(STREAK_AT_RISK);
        }

        @Test
        void replacesADailyReminderThatIsDueAtTheSameTime() {
            ReminderSettings close = new ReminderSettings(true, LocalTime.of(21, 0), true, LocalTime.of(21, 15));

            assertThat(ReminderPolicy.decide(at("21:20"), close, open(STREAK_AT_STAKE))).isEqualTo(STREAK_AT_RISK);
            assertThat(ReminderPolicy.decide(at("21:25"), close, open(STREAK_AT_STAKE, sent(STREAK_AT_RISK))))
                    .as("no daily reminder after the rescue").isEqualTo(NONE);
        }

        @Test
        void isSkippedWhenMoreThanAnHourLate() {
            assertThat(ReminderPolicy.decide(at("22:30"), ON, open(STREAK_AT_STAKE, sent(DAILY_REMINDER)))).isEqualTo(NONE);
        }
    }

    @Nested
    class Snooze {

        private final Instant inAnHour = at("20:05").toInstant();

        @Test
        void bringsTheDailyReminderBackOnce() {
            ReminderDay snoozed = open(NO_STREAK, new SentReminder(DAILY_REMINDER, inAnHour));

            assertThat(ReminderPolicy.decide(at("20:00"), ON, snoozed)).isEqualTo(NONE);
            assertThat(ReminderPolicy.decide(at("20:05"), ON, snoozed)).isEqualTo(DAILY_REMINDER);
            assertThat(ReminderPolicy.decide(at("21:04"), ON, snoozed)).isEqualTo(DAILY_REMINDER);
            assertThat(ReminderPolicy.decide(at("21:05"), ON, snoozed)).as("an hour late").isEqualTo(NONE);
        }

        @Test
        void bringsTheRescueBack() {
            Instant later = at("22:35").toInstant();
            ReminderDay snoozed = open(STREAK_AT_STAKE, sent(DAILY_REMINDER), new SentReminder(STREAK_AT_RISK, later));

            assertThat(ReminderPolicy.decide(at("22:35"), ON, snoozed)).isEqualTo(STREAK_AT_RISK);
        }

        @Test
        void givesWayToTheRescue() {
            Instant atRescueTime = at("21:30").toInstant();
            ReminderDay dailySnoozed = open(STREAK_AT_STAKE, new SentReminder(DAILY_REMINDER, atRescueTime));
            ReminderDay rescueSent = open(STREAK_AT_STAKE, new SentReminder(DAILY_REMINDER, atRescueTime), sent(STREAK_AT_RISK));

            assertThat(ReminderPolicy.decide(at("21:31"), ON, dailySnoozed)).isEqualTo(STREAK_AT_RISK);
            assertThat(ReminderPolicy.decide(at("21:35"), ON, rescueSent)).isEqualTo(NONE);
        }

        @Test
        void endsWithTheGoalMet() {
            ReminderDay met = new ReminderDay(true, NO_STREAK, List.of(new SentReminder(DAILY_REMINDER, inAnHour)));

            assertThat(ReminderPolicy.decide(at("20:05"), ON, met)).isEqualTo(NONE);
        }

        @Test
        void comesBackOnTheSameDayOnly() {
            assertThat(ReminderPolicy.snoozedUntil(at("19:00"), ReminderPolicy.SNOOZE)).contains(at("20:00").toInstant());
            assertThat(ReminderPolicy.snoozedUntil(at("22:59"), ReminderPolicy.SNOOZE)).contains(at("23:59").toInstant());
            assertThat(ReminderPolicy.snoozedUntil(at("23:00"), ReminderPolicy.SNOOZE)).isEmpty();
            assertThat(ReminderPolicy.snoozedUntil(at("23:30"), ReminderPolicy.SNOOZE)).isEmpty();
        }
    }

    @Nested
    class TimeZonesAndDst {

        @Test
        void followsTheWallClockOfTheLearnersTimeZone() {
            Instant evening = Instant.parse("2026-10-07T17:00:00Z");

            assertThat(ReminderPolicy.decide(evening.atZone(ZURICH), ON, open(NO_STREAK)))
                    .as("19:00 in Zurich").isEqualTo(DAILY_REMINDER);
            assertThat(ReminderPolicy.decide(evening.atZone(ZoneId.of("America/New_York")), ON, open(NO_STREAK)))
                    .as("13:00 in New York").isEqualTo(NONE);
            assertThat(ReminderPolicy.decide(Instant.parse("2026-10-07T23:00:00Z").atZone(ZoneId.of("America/New_York")),
                    ON, open(NO_STREAK))).as("19:00 in New York").isEqualTo(DAILY_REMINDER);
        }

        @Test
        void keepsTheTimeAcrossTheChangeToSummerTime() {
            // Sunday, 29 March 2026: 02:00 becomes 03:00 in Zurich.
            ZonedDateTime evening = LocalDateTime.of(2026, 3, 29, 19, 0).atZone(ZURICH);

            assertThat(evening.toInstant()).isEqualTo(Instant.parse("2026-03-29T17:00:00Z"));
            assertThat(ReminderPolicy.decide(evening, ON, open(NO_STREAK))).isEqualTo(DAILY_REMINDER);
            assertThat(ReminderPolicy.decide(evening.minusMinutes(1), ON, open(NO_STREAK))).isEqualTo(NONE);
        }

        @Test
        void sendsATimeInTheSkippedHourRightAfterIt() {
            ReminderSettings skipped = new ReminderSettings(true, LocalTime.of(2, 30), false, LocalTime.of(21, 30));
            ZonedDateTime beforeTheGap = LocalDateTime.of(2026, 3, 29, 1, 59).atZone(ZURICH);
            ZonedDateTime afterTheGap = beforeTheGap.plusMinutes(1);

            assertThat(afterTheGap.toLocalTime()).isEqualTo(LocalTime.of(3, 0));
            assertThat(ReminderPolicy.decide(beforeTheGap, skipped, open(NO_STREAK))).isEqualTo(NONE);
            assertThat(ReminderPolicy.decide(afterTheGap, skipped, open(NO_STREAK))).isEqualTo(DAILY_REMINDER);
        }

        @Test
        void sendsATimeInTheRepeatedHourOnce() {
            // Sunday, 25 October 2026: 03:00 becomes 02:00 again in Zurich.
            ReminderSettings repeated = new ReminderSettings(true, LocalTime.of(2, 30), false, LocalTime.of(21, 30));
            ZonedDateTime first = ZonedDateTime.ofInstant(Instant.parse("2026-10-25T00:30:00Z"), ZURICH);
            ZonedDateTime second = ZonedDateTime.ofInstant(Instant.parse("2026-10-25T01:30:00Z"), ZURICH);

            assertThat(second.toLocalTime()).isEqualTo(first.toLocalTime());
            assertThat(ReminderPolicy.decide(first, repeated, open(NO_STREAK))).isEqualTo(DAILY_REMINDER);
            assertThat(ReminderPolicy.decide(second, repeated, open(NO_STREAK, sent(DAILY_REMINDER)))).isEqualTo(NONE);
        }

        @Test
        void lastsNoLongerThanAReminderMayBeLate() {
            assertThat(ReminderPolicy.timeToLive(at("19:00"))).as("not delivered hours later").isEqualTo(ReminderPolicy.MAX_DELAY);
            assertThat(ReminderPolicy.timeToLive(at("23:00"))).isEqualTo(Duration.ofHours(1));
            assertThat(ReminderPolicy.timeToLive(LocalDateTime.of(2026, 3, 29, 1, 0).atZone(ZURICH)))
                    .as("the day of the change to summer time").isEqualTo(Duration.ofHours(1));
        }

        @Test
        void lastsAtMostUntilTheLearnersMidnight() {
            assertThat(ReminderPolicy.timeToLive(at("23:30"))).isEqualTo(Duration.ofMinutes(30));
            assertThat(ReminderPolicy.timeToLive(at("23:59:59"))).isEqualTo(Duration.ofSeconds(1));
        }

        @Test
        void snoozesByElapsedTimeAcrossTheRepeatedHour() {
            ZonedDateTime beforeTheChange = ZonedDateTime.ofInstant(Instant.parse("2026-10-25T00:30:00Z"), ZURICH);

            assertThat(ReminderPolicy.snoozedUntil(beforeTheChange, Duration.ofHours(1)))
                    .contains(Instant.parse("2026-10-25T01:30:00Z"));
        }
    }

    @Nested
    class AtRisk {

        @ParameterizedTest(name = "current {0}, freezes left {1}, extended today {2}, bridges yesterday {3} -> {4}")
        @CsvSource({
                "12, 0, false, false, true",
                "12, 1, false, false, false",
                "12, 1, false, true, true",
                "12, 0, false, true, true",
                "12, 0, true, false, false",
                "0, 0, false, false, false",
                "1, 0, false, false, true"})
        void whenMissingTodayWouldEndTheStreak(int current, int freezesLeft, boolean extendedToday, boolean bridgesYesterday,
                                              boolean atRisk) {
            StreakRule.Status status = new StreakRule.Status(current, Math.max(current, 1), freezesLeft, extendedToday,
                    TODAY.minusDays(1), bridgesYesterday);

            assertThat(ReminderPolicy.isAtRisk(status)).isEqualTo(atRisk);
        }

        @Test
        void agreesWithTheStreakRule() {
            // Wednesday: the streak ran until Monday, the freeze of this week bridges Tuesday.
            Streak stored = new Streak(4, 4, TODAY.minusDays(2), null, 1);
            StreakRule.Status today = StreakRule.status(stored, TODAY);
            StreakRule.Status ifTodayIsMissed = StreakRule.status(stored, TODAY.plusDays(1));

            assertThat(ReminderPolicy.isAtRisk(today)).isTrue();
            assertThat(ifTodayIsMissed.current()).isZero();
        }

        @Test
        void agreesWithTheStreakRuleWhileTheFreezeIsLeft() {
            Streak stored = new Streak(4, 4, TODAY.minusDays(1), null, 1);
            StreakRule.Status today = StreakRule.status(stored, TODAY);
            StreakRule.Status ifTodayIsMissed = StreakRule.status(stored, TODAY.plusDays(1));

            assertThat(ReminderPolicy.isAtRisk(today)).isFalse();
            assertThat(ifTodayIsMissed.current()).isEqualTo(4);
        }
    }

    @Nested
    class Settings {

        @Test
        void areOffByDefault() {
            assertThat(ReminderSettings.DEFAULT)
                    .isEqualTo(new ReminderSettings(false, LocalTime.of(19, 0), true, LocalTime.of(21, 30)));
        }

        @Test
        void needTheRescueAfterTheDailyReminder() {
            assertThatThrownBy(() -> new ReminderSettings(true, LocalTime.of(21, 0), true, LocalTime.of(21, 0)))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThat(new ReminderSettings(true, LocalTime.of(21, 0), false, LocalTime.of(20, 0)).rescueEnabled()).isFalse();
        }

        @Test
        void recordEachKindOnceADay() {
            assertThatThrownBy(() -> open(NO_STREAK, sent(DAILY_REMINDER), sent(DAILY_REMINDER)))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> sent(NONE)).isInstanceOf(IllegalArgumentException.class);
        }
    }
}
