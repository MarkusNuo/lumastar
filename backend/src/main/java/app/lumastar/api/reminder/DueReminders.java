package app.lumastar.api.reminder;

import app.lumastar.api.push.PushDevices;
import app.lumastar.api.push.PushDevices.Delivery;
import app.lumastar.api.reminder.ReminderSnoozes.IssuedToken;
import app.lumastar.core.progress.DailyGoal;
import app.lumastar.core.progress.StreakRule;
import app.lumastar.core.reminder.Reminder;
import app.lumastar.core.reminder.ReminderDay;
import app.lumastar.core.reminder.ReminderPolicy;
import app.lumastar.persistence.PracticeQueries;
import app.lumastar.persistence.ReminderStore;
import app.lumastar.persistence.ReminderStore.Candidate;
import app.lumastar.persistence.SrsCardStore;
import app.lumastar.persistence.StreakStore;
import app.lumastar.push.PushSetup;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Sends the reminders that are due (PRD F9), every few minutes ({@code lumastar.reminders.cron}, {@code -} switches it
 * off): {@link ReminderPolicy} decides for each learner the store preselects, the latest first. A reminder is recorded
 * before it is sent, so that a restart never sends it twice. The decisions take no push request; the push messages go
 * out in the background in the same order, so that a slow push service delays no other learner's reminder beyond
 * its limit. Without web push nothing happens.
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

    @Scheduled(cron = "${lumastar.reminders.cron}", zone = "UTC")
    void sendDueReminders() {
        sendDue();
    }

    /** Sends the due reminders and waits until they are delivered; the result is in the order of the decisions. */
    public List<SentNotification> sendDue() {
        if (!setup.available()) {
            return List.of();
        }
        Instant now = clock.instant();
        List<CompletableFuture<Optional<SentNotification>>> sending = candidates(now).stream()
                .map(candidate -> remind(candidate, now))
                .toList();
        List<SentNotification> sent = sending.stream().map(CompletableFuture::join).flatMap(Optional::stream).toList();
        reminders.deleteBefore(LocalDate.ofInstant(now, ZoneOffset.UTC).minusDays(LOG_RETENTION_DAYS));
        return sent;
    }

    private List<Candidate> candidates(Instant now) {
        Map<ZoneId, LocalDateTime> localNow = reminders.zonesWithReminders().stream()
                .collect(Collectors.toMap(Function.identity(), zone -> LocalDateTime.ofInstant(now, zone)));
        return localNow.isEmpty() ? List.of() : reminders.candidates(now, localNow, ReminderPolicy.MAX_DELAY);
    }

    /** A failure leaves the other learners' reminders alone. */
    private CompletableFuture<Optional<SentNotification>> remind(Candidate candidate, Instant now) {
        try {
            return decideAndSend(candidate, now).exceptionally(failure -> failed(candidate, failure));
        } catch (RuntimeException e) {
            return CompletableFuture.completedFuture(failed(candidate, e));
        }
    }

    private CompletableFuture<Optional<SentNotification>> decideAndSend(Candidate candidate, Instant now) {
        UUID userId = candidate.userId();
        ZonedDateTime localNow = now.atZone(candidate.zone());
        LocalDate today = localNow.toLocalDate();
        DailyGoal goal = DailyGoal.of(practice.on(userId, today, candidate.zone()).practised(), candidate.dailyGoalMinutes());
        StreakRule.Status streak = StreakRule.status(streaks.streak(userId), today);
        ReminderDay day = new ReminderDay(goal.met(), streak, reminders.sentOn(userId, today));
        Reminder reminder = ReminderPolicy.decide(localNow, candidate.settings(), day);
        if (reminder == Reminder.NONE) {
            return CompletableFuture.completedFuture(Optional.empty());
        }
        Optional<IssuedToken> snoozeToken = snoozes.issue(localNow);
        if (!reminders.claim(userId, today, day.sent(reminder), reminder, snoozeToken.map(IssuedToken::stored), now)) {
            return CompletableFuture.completedFuture(Optional.empty());
        }
        return devices.deliver(userId, ReminderNotifications.of(reminder, streak.current(), goal, cards.dueNow(userId, now),
                        snoozeToken.map(IssuedToken::token)), ReminderPolicy.timeToLive(localNow))
                .thenApply(delivery -> {
                    reminders.recordDelivery(userId, today, reminder, delivery.devices(), delivery.delivered());
                    LOG.info("Sent {} to learner {}: {} of {} devices", reminder.code(), userId, delivery.delivered(),
                            delivery.devices());
                    return Optional.of(new SentNotification(userId, reminder, delivery));
                });
    }

    private static Optional<SentNotification> failed(Candidate candidate, Throwable failure) {
        LOG.error("Reminder failed for learner {}", candidate.userId(), failure);
        return Optional.empty();
    }
}
