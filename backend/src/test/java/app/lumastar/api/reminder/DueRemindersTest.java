package app.lumastar.api.reminder;

import static app.lumastar.ProblemAssert.assertProblem;
import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.ClockedIntegrationTest;
import app.lumastar.LessonDriver;
import app.lumastar.PlacementDriver;
import app.lumastar.PushSubscriptions;
import app.lumastar.RecordingPushSender.SentPush;
import app.lumastar.SpaClient;
import app.lumastar.SyntheticContent;
import app.lumastar.api.reminder.DueReminders.SentNotification;
import app.lumastar.content.ContentSeeder;
import app.lumastar.core.reminder.Reminder;
import app.lumastar.push.NotificationAction;
import app.lumastar.push.NotificationKind;
import app.lumastar.push.PushNotification;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/**
 * The reminder job with the application's clock moved by the test and push messages recorded instead of sent. The
 * learner lives in Zurich (UTC+2 in October) and wants reminders at 19:00 with the streak rescue at 21:30, on
 * Wednesday, 7 October 2026.
 */
class DueRemindersTest extends ClockedIntegrationTest {

    private static final String PHONE = "https://fcm.googleapis.com/fcm/send/phone";
    private static final String LAPTOP = "https://updates.push.services.mozilla.com/wpush/v2/laptop";
    private static final Duration PATIENCE = Duration.ofSeconds(10);
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 7);
    private static final Instant SEVEN_PM = Instant.parse("2026-10-07T17:00:00Z");
    private static final Instant HALF_PAST_NINE_PM = Instant.parse("2026-10-07T19:30:00Z");

    @Autowired
    private DueReminders reminders;

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;
    private UUID learnerId;

    @BeforeEach
    void learnerWithRemindersOnOnePhone() {
        clock.set(Instant.parse("2026-10-07T06:00:00Z"));
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(SyntheticContent.bundle());
        learner = new SpaClient(mvc);
        String email = learner.register("Erza");
        learnerId = jdbc.sql("SELECT id FROM users WHERE email = :email").param("email", email).query(UUID.class).single();
        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE))).hasStatusOk();
        assertThat(learner.put("/api/reminders", """
                {"enabled": true, "time": "19:00", "rescueEnabled": true, "rescueTime": "21:30"}""")).hasStatusOk();
    }

    @Test
    void remindsTheLearnerOnceAtTheChosenTime() {
        clock.set(SEVEN_PM.minusSeconds(1));
        assertThat(reminders.sendDue()).isEmpty();

        clock.set(SEVEN_PM);
        assertThat(reminders.sendDue()).extracting(SentNotification::reminder).containsExactly(Reminder.DAILY_REMINDER);
        clock.advance(Duration.ofMinutes(5));
        assertThat(reminders.sendDue()).as("once a day").isEmpty();

        SentPush push = pushes.sent().getFirst();
        assertThat(push.endpoint()).isEqualTo(PHONE);
        assertThat(push.timeToLive()).as("no later than a reminder may be sent").isEqualTo(Duration.ofHours(1));
        PushNotification notification = push.notification();
        assertThat(notification.kind()).isEqualTo(NotificationKind.DAILY_REMINDER);
        assertThat(notification.title()).isEqualTo("Zeit für Gheg!");
        assertThat(notification.body()).isEqualTo("10 Minuten reichen für dein Tagesziel.");
        assertThat(notification.url()).isEqualTo("/");
        assertThat(notification.tag()).isEqualTo("lumastar-daily-reminder");
        assertThat(notification.renotify()).isTrue();
        assertThat(notification.badgeCount()).as("the open daily goal").isEqualTo(1);
        assertThat(notification.actions()).extracting(NotificationAction::action)
                .containsExactly(NotificationAction.Type.PRACTISE, NotificationAction.Type.SNOOZE);
        assertThat(notification.snoozeToken()).hasSize(43);
        assertThat(jdbc.sql("SELECT day || ' ' || kind || ' ' || devices || ' ' || delivered FROM reminder_log")
                .query(String.class).single()).isEqualTo("2026-10-07 daily_reminder 1 1");
    }

    @Test
    void neverSendsTheSameReminderTwiceEvenIfTheJobRunsAgainAtOnce() {
        clock.set(SEVEN_PM);

        assertThat(reminders.sendDue()).hasSize(1);
        assertThat(reminders.sendDue()).isEmpty();
        assertThat(pushes.sent()).hasSize(1);
    }

    @Test
    void followsTheTimeZoneOfTheLearner() {
        assertThat(learner.put("/api/settings", """
                {"dailyGoalMinutes": 10, "requestRetention": 0.9, "timeZone": "America/New_York"}""")).hasStatusOk();

        clock.set(SEVEN_PM);
        assertThat(reminders.sendDue()).as("13:00 in New York").isEmpty();
        clock.set(Instant.parse("2026-10-07T23:00:00Z"));
        assertThat(reminders.sendDue()).as("19:00 in New York").hasSize(1);
        assertThat(jdbc.sql("SELECT day FROM reminder_log").query(LocalDate.class).single()).isEqualTo(WEDNESDAY);
    }

    @Test
    void sendsNothingOnceTheDailyGoalIsMet() {
        new PlacementDriver(learner, jdbc).answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
        LessonDriver lessons = new LessonDriver(learner);
        JsonNode lesson = lessons.start(LessonDriver.A0_WORDS);
        clock.advance(Duration.ofMinutes(11));
        lessons.answerAll(lesson, "ja");
        lessons.complete(lesson);
        streak(5, WEDNESDAY.minusDays(1), 0);
        assertThat(learner.get("/api/progress/today")).bodyJson().extractingPath("$.goalMet").isEqualTo(true);

        clock.set(SEVEN_PM);
        assertThat(reminders.sendDue()).isEmpty();
        clock.set(HALF_PAST_NINE_PM);
        assertThat(reminders.sendDue()).isEmpty();
        assertThat(pushes.sent()).isEmpty();
    }

    @Test
    void countsTheMinutesLeftOnceTheLearnerHasStarted() {
        new PlacementDriver(learner, jdbc).answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
        LessonDriver lessons = new LessonDriver(learner);
        JsonNode lesson = lessons.start(LessonDriver.A0_WORDS);
        clock.advance(Duration.ofMinutes(4));
        lessons.answerAll(lesson, "ja");
        lessons.complete(lesson);

        clock.set(SEVEN_PM);
        reminders.sendDue();

        assertThat(pushes.sent().getFirst().notification().body()).isEqualTo("Nur noch 6 Minuten bis zu deinem Tagesziel.");
    }

    @Test
    void rescuesAStreakThatWouldEndTonight() {
        streak(12, WEDNESDAY.minusDays(1), 0);

        clock.set(SEVEN_PM);
        reminders.sendDue();
        clock.set(HALF_PAST_NINE_PM);
        assertThat(reminders.sendDue()).extracting(SentNotification::reminder).containsExactly(Reminder.STREAK_AT_RISK);
        clock.advance(Duration.ofMinutes(5));
        assertThat(reminders.sendDue()).isEmpty();

        assertThat(pushes.sent()).extracting(sent -> sent.notification().title())
                .containsExactly("Zeit für Gheg! 🔥", "Dein 12-Tage-Streak ist in Gefahr! 🔥");
        assertThat(pushes.sent().get(0).notification().body()).isEqualTo("Dein 12-Tage-Streak wartet auf dich.");
        PushNotification rescue = pushes.sent().get(1).notification();
        assertThat(rescue.body()).isEqualTo("Mit 10 Minuten Gheg rettest du ihn noch heute.");
        assertThat(rescue.tag()).isEqualTo("lumastar-streak-at-risk");
        assertThat(pushes.sent().get(1).timeToLive()).isEqualTo(Duration.ofHours(1));
    }

    @Test
    void leavesTheRescueOutWhileTheWeeklyFreezeWouldBridgeToday() {
        streak(12, WEDNESDAY.minusDays(1), 1);

        clock.set(HALF_PAST_NINE_PM);

        assertThat(reminders.sendDue()).isEmpty();
    }

    @Test
    void theServiceWorkerSnoozesAReminderForAnHourWithItsToken() {
        clock.set(SEVEN_PM);
        reminders.sendDue();
        String token = pushes.sent().getFirst().notification().snoozeToken();
        clock.advance(Duration.ofMinutes(2));

        MvcTestResult snoozed = new SpaClient(mvc).postWithoutCsrfHeader("/api/reminders/snooze", """
                {"token": "%s"}""".formatted(token));

        assertThat(snoozed).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"snoozedUntil": "2026-10-07T18:02:00Z"}""");
        clock.set(Instant.parse("2026-10-07T18:01:59Z"));
        assertThat(reminders.sendDue()).isEmpty();
        clock.set(Instant.parse("2026-10-07T18:05:00Z"));
        assertThat(reminders.sendDue()).extracting(SentNotification::reminder).containsExactly(Reminder.DAILY_REMINDER);
        assertThat(reminders.sendDue()).isEmpty();

        String newToken = pushes.sent().get(1).notification().snoozeToken();
        assertThat(newToken).isNotEqualTo(token);
        assertProblem(new SpaClient(mvc).postWithoutCsrfHeader("/api/reminders/snooze", """
                {"token": "%s"}""".formatted(token)), HttpStatus.NOT_FOUND, "snooze_token_invalid");
        assertThat(jdbc.sql("SELECT sends FROM reminder_log").query(Integer.class).single()).isEqualTo(2);
    }

    @Test
    void aSnoozeEndsWithTheDay() {
        assertThat(learner.put("/api/reminders", """
                {"enabled": true, "time": "22:15", "rescueEnabled": false, "rescueTime": "21:30"}""")).hasStatusOk();
        clock.set(Instant.parse("2026-10-07T20:15:00Z"));
        reminders.sendDue();
        String token = pushes.sent().getFirst().notification().snoozeToken();

        clock.set(Instant.parse("2026-10-07T21:05:00Z"));
        assertProblem(new SpaClient(mvc).postWithoutCsrfHeader("/api/reminders/snooze", """
                {"token": "%s"}""".formatted(token)), HttpStatus.CONFLICT, "snooze_too_late");
        clock.set(Instant.parse("2026-10-07T22:00:00Z"));
        assertProblem(new SpaClient(mvc).postWithoutCsrfHeader("/api/reminders/snooze", """
                {"token": "%s", "minutes": 5}""".formatted(token)), HttpStatus.NOT_FOUND, "snooze_token_invalid");
    }

    @Test
    void aSnoozeTokenWorksOnce() {
        clock.set(SEVEN_PM);
        reminders.sendDue();
        String token = pushes.sent().getFirst().notification().snoozeToken();
        SpaClient serviceWorker = new SpaClient(mvc);

        assertThat(serviceWorker.postWithoutCsrfHeader("/api/reminders/snooze", """
                {"token": "%s"}""".formatted(token))).hasStatusOk();
        clock.advance(Duration.ofMinutes(1));

        assertProblem(serviceWorker.postWithoutCsrfHeader("/api/reminders/snooze", """
                {"token": "%s", "minutes": 5}""".formatted(token)), HttpStatus.NOT_FOUND, "snooze_token_invalid");
        assertThat(jdbc.sql("""
                        SELECT to_char(snoozed_until AT TIME ZONE 'UTC', 'HH24:MI') || ' ' || (snooze_token_hash IS NULL)
                        FROM reminder_log""").query(String.class).single())
                .as("the first snooze stands, the token is spent").isEqualTo("18:00 true");
    }

    @Test
    void aLateReminderOffersNoSnooze() {
        assertThat(learner.put("/api/reminders", """
                {"enabled": true, "time": "23:30", "rescueEnabled": false, "rescueTime": "21:30"}""")).hasStatusOk();
        clock.set(Instant.parse("2026-10-07T21:30:00Z"));

        reminders.sendDue();

        PushNotification late = pushes.sent().getFirst().notification();
        assertThat(late.snoozeToken()).isNull();
        assertThat(late.actions()).extracting(NotificationAction::action).containsExactly(NotificationAction.Type.PRACTISE);
        assertThat(pushes.sent().getFirst().timeToLive()).as("until midnight in Zurich").isEqualTo(Duration.ofMinutes(30));
    }

    @Test
    void aSlowPushServiceHoldsUpNoOtherLearnersReminder() throws Exception {
        SpaClient bora = new SpaClient(mvc);
        String boraEmail = bora.register("Bora");
        UUID boraId = jdbc.sql("SELECT id FROM users WHERE email = :email").param("email", boraEmail).query(UUID.class).single();
        assertThat(bora.post("/api/push/subscriptions", PushSubscriptions.json(LAPTOP))).hasStatusOk();
        assertThat(bora.put("/api/reminders", """
                {"enabled": true, "time": "18:30", "rescueEnabled": false, "rescueTime": "21:30"}""")).hasStatusOk();
        pushes.hold(LAPTOP);
        clock.set(SEVEN_PM.plus(Duration.ofMinutes(10)));

        CompletableFuture<List<SentNotification>> job = CompletableFuture.supplyAsync(reminders::sendDue);
        try {
            assertThat(pushes.awaitSent(PHONE, PATIENCE)).as("Erza's reminder goes out while Bora's push service hangs")
                    .isTrue();
            assertThat(job).isNotDone();
        } finally {
            pushes.release(LAPTOP);
        }

        assertThat(job.get(PATIENCE.toSeconds(), TimeUnit.SECONDS)).extracting(SentNotification::userId)
                .as("Bora's reminder is 40 minutes late, Erza's 10: the latest first").containsExactly(boraId, learnerId);
        assertThat(pushes.sent()).extracting(SentPush::endpoint).containsExactly(PHONE, LAPTOP);
    }

    @Test
    void refusesUnknownTokensAndInvalidSnoozes() {
        SpaClient serviceWorker = new SpaClient(mvc);

        assertProblem(serviceWorker.postWithoutCsrfHeader("/api/reminders/snooze", """
                {"token": "unknown"}"""), HttpStatus.NOT_FOUND, "snooze_token_invalid");
        assertThat(serviceWorker.postWithoutCsrfHeader("/api/reminders/snooze", """
                {"token": "x", "minutes": 600}""")).hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson().extractingPath("$.errors[*].field").isEqualTo(List.of("minutes"));
    }

    @Test
    void sendsNothingWithoutDeviceOrWithRemindersOff() {
        assertThat(learner.delete("/api/push/subscriptions", """
                {"endpoint": "%s"}""".formatted(PHONE))).hasStatus(HttpStatus.NO_CONTENT);
        clock.set(SEVEN_PM);
        assertThat(reminders.sendDue()).isEmpty();

        assertThat(learner.post("/api/push/subscriptions", PushSubscriptions.json(PHONE))).hasStatusOk();
        assertThat(learner.put("/api/reminders", """
                {"enabled": false, "time": "19:00", "rescueEnabled": true, "rescueTime": "21:30"}""")).hasStatusOk();
        assertThat(reminders.sendDue()).isEmpty();
        assertThat(pushes.sent()).isEmpty();
    }

    @Test
    void skipsAReminderMoreThanAnHourLate() {
        clock.set(Instant.parse("2026-10-07T18:00:00Z"));

        assertThat(reminders.sendDue()).isEmpty();
    }

    @Test
    void forgetsTheRemindersOfLastWeek() {
        jdbc.sql("""
                        INSERT INTO reminder_log (user_id, day, kind, sent_at)
                        VALUES (:user, DATE '2026-09-29', 'daily_reminder', now()), (:user, DATE '2026-09-30', 'daily_reminder', now())""")
                .param("user", learnerId).update();

        clock.set(SEVEN_PM);
        reminders.sendDue();

        assertThat(jdbc.sql("SELECT day FROM reminder_log ORDER BY day").query(LocalDate.class).list())
                .containsExactly(LocalDate.of(2026, 9, 30), WEDNESDAY);
    }

    /** The stored streak: {@code days} up to {@code lastActive}, with the freezes left in this week (from Monday 5th). */
    private void streak(int days, LocalDate lastActive, int freezesLeft) {
        jdbc.sql("""
                        INSERT INTO streaks (user_id, current_days, longest_days, last_active_date, freezes_refilled_on,
                                             freezes_available)
                        VALUES (:user, :days, :days, :lastActive, DATE '2026-10-05', :freezesLeft)
                        ON CONFLICT (user_id) DO UPDATE
                        SET current_days = :days, longest_days = greatest(streaks.longest_days, :days),
                            last_active_date = greatest(streaks.last_active_date, :lastActive),
                            freezes_refilled_on = DATE '2026-10-05', freezes_available = :freezesLeft""")
                .param("user", learnerId)
                .param("days", days)
                .param("lastActive", lastActive)
                .param("freezesLeft", freezesLeft)
                .update();
    }
}
