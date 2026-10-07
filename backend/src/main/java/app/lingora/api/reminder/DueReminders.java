package app.lingora.api.reminder;

import app.lingora.api.push.PushDevices;
import app.lingora.api.push.PushDevices.Delivery;
import app.lingora.api.reminder.ReminderSnoozes.IssuedToken;
import app.lingora.core.progress.DailyGoal;
import app.lingora.core.progress.StreakRule;
import app.lingora.core.reminder.Reminder;
import app.lingora.core.reminder.ReminderDay;
import app.lingora.core.reminder.ReminderPolicy;
import app.lingora.persistence.PracticeQueries;
import app.lingora.persistence.ReminderStore;
import app.lingora.persistence.ReminderStore.Candidate;
import app.lingora.persistence.SrsCardStore;
import app.lingora.persistence.StreakStore;
import app.lingora.push.PushSetup;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Sends the reminders that are due (PRD F9), every few minutes ({@code lingora.reminders.cron}, {@code -} switches it
 * off): {@link ReminderPolicy} decides for each learner the store preselects. A reminder is recorded before it is
 * sent, so that a restart never sends it twice. Without web push nothing happens.
 */
@Service
public class DueReminders {

    private static final Logger LOG = LoggerFactory.getLogger(DueReminders.class);
    /** Sent reminders are kept for a week, a little longer than any learner's day lasts. */
    private static final int LOG_RETENTION_DAYS = 7;

    private final PushSetup setup;
    private final ReminderStore reminders;
    private final StreakStore streaks;
    private final PracticeQueries practice;
    private final SrsCardStore cards;
    private final PushDevices devices;
    private final ReminderSnoozes snoozes;
    private final Clock clock;

    DueReminders(PushSetup setup, ReminderStore reminders, StreakStore streaks, PracticeQueries practice,
                 SrsCardStore cards, PushDevices devices, ReminderSnoozes snoozes, Clock clock) {
        this.setup = setup;
        this.reminders = reminders;
        this.streaks = streaks;
        this.practice = practice;
        this.cards = cards;
        this.devices = devices;
        this.snoozes = snoozes;
        this.clock = clock;
    }

    /** A reminder that went out, and to how many devices. */
    public record SentNotification(UUID userId, Reminder reminder, Delivery delivery) {
    }

    @Scheduled(cron = "${lingora.reminders.cron}", zone = "UTC")
    void sendDueReminders() {
        sendDue();
    }

    public List<SentNotification> sendDue() {
        if (!setup.available()) {
            return List.of();
        }
        Instant now = clock.instant();
        Map<ZoneId, LocalDateTime> localNow = reminders.zonesWithReminders().stream()
                .collect(Collectors.toMap(Function.identity(), zone -> LocalDateTime.ofInstant(now, zone)));
        List<SentNotification> sent = new ArrayList<>();
        if (!localNow.isEmpty()) {
            for (Candidate candidate : reminders.candidates(now, localNow, ReminderPolicy.MAX_DELAY)) {
                try {
                    remind(candidate, now).ifPresent(sent::add);
                } catch (RuntimeException e) {
                    LOG.error("Reminder failed for learner {}", candidate.userId(), e);
                }
            }
        }
        reminders.deleteBefore(LocalDate.ofInstant(now, ZoneOffset.UTC).minusDays(LOG_RETENTION_DAYS));
        return sent;
    }

    private Optional<SentNotification> remind(Candidate candidate, Instant now) {
        UUID userId = candidate.userId();
        ZonedDateTime localNow = now.atZone(candidate.zone());
        LocalDate today = localNow.toLocalDate();
        DailyGoal goal = DailyGoal.of(practice.on(userId, today, candidate.zone()).practised(), candidate.dailyGoalMinutes());
        StreakRule.Status streak = StreakRule.status(streaks.streak(userId), today);
        ReminderDay day = new ReminderDay(goal.met(), streak, reminders.sentOn(userId, today));
        Reminder reminder = ReminderPolicy.decide(localNow, candidate.settings(), day);
        if (reminder == Reminder.NONE) {
            return Optional.empty();
        }
        Optional<IssuedToken> snoozeToken = snoozes.issue(localNow);
        if (!reminders.claim(userId, today, day.sent(reminder), reminder, snoozeToken.map(IssuedToken::stored), now)) {
            return Optional.empty();
        }
        Delivery delivery = devices.deliver(userId, ReminderNotifications.of(reminder, streak.current(), goal,
                cards.dueNow(userId, now), snoozeToken.map(IssuedToken::token)), ReminderPolicy.timeToLive(localNow));
        reminders.recordDelivery(userId, today, reminder, delivery.devices(), delivery.delivered());
        LOG.info("Sent {} to learner {}: {} of {} devices", reminder.code(), userId, delivery.delivered(), delivery.devices());
        return Optional.of(new SentNotification(userId, reminder, delivery));
    }
}
