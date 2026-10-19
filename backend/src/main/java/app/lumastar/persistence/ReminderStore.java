package app.lumastar.persistence;

import app.lumastar.core.reminder.Reminder;
import app.lumastar.core.reminder.ReminderSettings;
import app.lumastar.core.reminder.SentReminder;
import app.lumastar.domain.Coded;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Tables {@code reminder_settings} and {@code reminder_log}: the learner's reminders and the ones sent. */
@Repository
public class ReminderStore {

    private static final String SETTINGS_COLUMNS = "enabled, daily_time, rescue_enabled, rescue_time";

    /*
     * A cheap preselection for ReminderPolicy, which decides: learners with reminders on, a device to send to and
     * today's goal not yet met, whose daily reminder or streak rescue time has just come and has not been sent today,
     * or whose snooze has run out. The local time of each time zone comes from Java, so that unknown zones cannot break
     * the query and DST follows the same rules as the policy. The latest reminders come first: they are the closest to
     * being skipped.
     */
    private static final String DUE = """
            WITH zone_now (time_zone, local_now) AS (
                SELECT * FROM unnest(CAST(:zones AS text[]), CAST(CAST(:localNows AS text[]) AS timestamp[]))
            ), learner_now AS (
                SELECT r.*, u.time_zone, u.daily_goal_minutes, z.local_now, CAST(z.local_now AS date) AS today
                FROM reminder_settings r
                JOIN users u ON u.id = r.user_id
                JOIN zone_now z ON z.time_zone = u.time_zone
                WHERE r.enabled AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = r.user_id)
            )
            SELECT l.user_id, l.time_zone, l.daily_goal_minutes, %s
            FROM learner_now l
            CROSS JOIN LATERAL (
                SELECT max(due.late) AS late
                FROM (
                    SELECT l.local_now - (l.today + l.daily_time)
                    WHERE NOT EXISTS (SELECT 1 FROM reminder_log g WHERE g.user_id = l.user_id AND g.day = l.today)
                    UNION ALL
                    SELECT l.local_now - (l.today + l.rescue_time)
                    WHERE l.rescue_enabled AND NOT EXISTS (SELECT 1 FROM reminder_log g WHERE g.user_id = l.user_id
                                                           AND g.day = l.today AND g.kind = 'streak_at_risk')
                    UNION ALL
                    SELECT :now - g.snoozed_until
                    FROM reminder_log g WHERE g.user_id = l.user_id AND g.day = l.today AND g.snoozed_until IS NOT NULL
                ) AS due (late)
                WHERE due.late >= interval '0' AND due.late < :window * interval '1 second'
            ) AS d
            WHERE d.late IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM streaks s WHERE s.user_id = l.user_id AND s.last_active_date >= l.today)
            ORDER BY d.late DESC, l.user_id""".formatted(SETTINGS_COLUMNS);

    private final JdbcClient jdbc;

    public ReminderStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** A learner who may be due for a reminder. */
    public record Candidate(UUID userId, ZoneId zone, int dailyGoalMinutes, ReminderSettings settings) {
    }

    /** The hash of a snooze token, which is never stored itself, and when it expires. */
    public record SnoozeToken(String hash, Instant expiresAt) {
    }

    /** A reminder whose snooze token was presented, with the time zone of its learner. */
    public record SnoozableReminder(UUID id, ZoneId zone, Instant tokenExpiresAt) {
    }

    /** The learner's reminders; {@link ReminderSettings#DEFAULT} until they are first saved. */
    public ReminderSettings settings(UUID userId) {
        return jdbc.sql("SELECT %s FROM reminder_settings WHERE user_id = :user".formatted(SETTINGS_COLUMNS))
                .param("user", userId)
                .query(ReminderStore::settings)
                .optional()
                .orElse(ReminderSettings.DEFAULT);
    }

    public void save(UUID userId, ReminderSettings settings, Instant at) {
        jdbc.sql("""
                        INSERT INTO reminder_settings (user_id, enabled, daily_time, rescue_enabled, rescue_time, updated_at)
                        VALUES (:user, :enabled, :time, :rescueEnabled, :rescueTime, :at)
                        ON CONFLICT (user_id) DO UPDATE
                        SET enabled = excluded.enabled, daily_time = excluded.daily_time,
                            rescue_enabled = excluded.rescue_enabled, rescue_time = excluded.rescue_time,
                            updated_at = excluded.updated_at""")
                .param("user", userId)
                .param("enabled", settings.enabled())
                .param("time", settings.time())
                .param("rescueEnabled", settings.rescueEnabled())
                .param("rescueTime", settings.rescueTime())
                .param("at", SqlTimestamps.of(at))
                .update();
    }

    /** The time zones of the learners with reminders on. */
    public List<ZoneId> zonesWithReminders() {
        return jdbc.sql("""
                        SELECT DISTINCT u.time_zone FROM reminder_settings r JOIN users u ON u.id = r.user_id
                        WHERE r.enabled ORDER BY u.time_zone""")
                .query(String.class)
                .list().stream()
                .map(ZoneId::of)
                .toList();
    }

    /**
     * The learners who may be due for a reminder at {@code now}, the one whose reminder is latest first.
     *
     * @param localNow the local time of {@code now} in each time zone of {@link #zonesWithReminders()}
     * @param maxDelay how late a reminder may still be sent
     */
    public List<Candidate> candidates(Instant now, Map<ZoneId, LocalDateTime> localNow, Duration maxDelay) {
        List<Map.Entry<ZoneId, LocalDateTime>> zones = List.copyOf(localNow.entrySet());
        return jdbc.sql(DUE)
                .param("zones", zones.stream().map(zone -> zone.getKey().getId()).toArray(String[]::new))
                .param("localNows", zones.stream().map(zone -> zone.getValue().toString()).toArray(String[]::new))
                .param("now", SqlTimestamps.of(now))
                .param("window", maxDelay.toSeconds())
                .query((row, rowNumber) -> new Candidate(row.getObject("user_id", UUID.class),
                        ZoneId.of(row.getString("time_zone")), row.getInt("daily_goal_minutes"), settings(row, rowNumber)))
                .list();
    }

    /** The reminders sent to the learner on {@code day}. */
    public List<SentReminder> sentOn(UUID userId, LocalDate day) {
        return jdbc.sql("SELECT kind, snoozed_until FROM reminder_log WHERE user_id = :user AND day = :day ORDER BY kind")
                .param("user", userId)
                .param("day", day)
                .query((row, rowNumber) -> new SentReminder(Coded.fromCode(Reminder.class, row.getString("kind")),
                        SqlTimestamps.instant(row, "snoozed_until")))
                .list();
    }

    /**
     * Records that the reminder is being sent, before it is: whoever records it first sends it, so a restart or a second
     * instance never sends it twice.
     *
     * @param previous    the same reminder sent earlier today and snoozed since, if it is sent again
     * @param snoozeToken the snooze token of the notification; empty if it offers no snooze
     * @return whether this call recorded it; {@code false} if it is sent already
     */
    public boolean claim(UUID userId, LocalDate day, Optional<SentReminder> previous, Reminder reminder,
                         Optional<SnoozeToken> snoozeToken, Instant at) {
        if (previous.isPresent()) {
            return jdbc.sql("""
                            UPDATE reminder_log
                            SET snoozed_until = NULL, sent_at = :at, sends = sends + 1, devices = 0, delivered = 0,
                                snooze_token_hash = :tokenHash, snooze_expires_at = :tokenExpiresAt
                            WHERE user_id = :user AND day = :day AND kind = :kind AND snoozed_until = :snoozedUntil""")
                    .param("at", SqlTimestamps.of(at))
                    .param("tokenHash", snoozeToken.map(SnoozeToken::hash).orElse(null))
                    .param("tokenExpiresAt", SqlTimestamps.of(snoozeToken.map(SnoozeToken::expiresAt).orElse(null)))
                    .param("user", userId)
                    .param("day", day)
                    .param("kind", reminder.code())
                    .param("snoozedUntil", SqlTimestamps.of(previous.get().snoozedUntil()))
                    .update() > 0;
        }
        return jdbc.sql("""
                        INSERT INTO reminder_log (user_id, day, kind, sent_at, snooze_token_hash, snooze_expires_at)
                        VALUES (:user, :day, :kind, :at, :tokenHash, :tokenExpiresAt)
                        ON CONFLICT (user_id, day, kind) DO NOTHING""")
                .param("user", userId)
                .param("day", day)
                .param("kind", reminder.code())
                .param("at", SqlTimestamps.of(at))
                .param("tokenHash", snoozeToken.map(SnoozeToken::hash).orElse(null))
                .param("tokenExpiresAt", SqlTimestamps.of(snoozeToken.map(SnoozeToken::expiresAt).orElse(null)))
                .update() > 0;
    }

    public void recordDelivery(UUID userId, LocalDate day, Reminder reminder, int devices, int delivered) {
        jdbc.sql("""
                        UPDATE reminder_log SET devices = :devices, delivered = :delivered
                        WHERE user_id = :user AND day = :day AND kind = :kind""")
                .param("devices", devices)
                .param("delivered", delivered)
                .param("user", userId)
                .param("day", day)
                .param("kind", reminder.code())
                .update();
    }

    /** The reminder whose notification carried the snooze token with this hash. */
    public Optional<SnoozableReminder> bySnoozeToken(String tokenHash) {
        return jdbc.sql("""
                        SELECT g.id, u.time_zone, g.snooze_expires_at
                        FROM reminder_log g JOIN users u ON u.id = g.user_id
                        WHERE g.snooze_token_hash = :hash""")
                .param("hash", tokenHash)
                .query((row, rowNumber) -> new SnoozableReminder(row.getObject("id", UUID.class),
                        ZoneId.of(row.getString("time_zone")), SqlTimestamps.instant(row, "snooze_expires_at")))
                .optional();
    }

    /**
     * Snoozes the reminder and spends its snooze token in one step, so that a token works once even if it is presented
     * twice at the same time.
     *
     * @return whether the token was still valid at {@code now}; {@code false} if it was used, replaced or has expired
     */
    public boolean snooze(UUID reminderId, String tokenHash, Instant until, Instant now) {
        return jdbc.sql("""
                        UPDATE reminder_log SET snoozed_until = :until, snooze_token_hash = NULL, snooze_expires_at = NULL
                        WHERE id = :id AND snooze_token_hash = :hash AND snooze_expires_at > :now""")
                .param("until", SqlTimestamps.of(until))
                .param("id", reminderId)
                .param("hash", tokenHash)
                .param("now", SqlTimestamps.of(now))
                .update() > 0;
    }

    /** Forgets the reminders of the days before {@code day}; the policy only needs today's. */
    public void deleteBefore(LocalDate day) {
        jdbc.sql("DELETE FROM reminder_log WHERE day < :day").param("day", day).update();
    }

    private static ReminderSettings settings(ResultSet row, int rowNumber) throws SQLException {
        return new ReminderSettings(row.getBoolean("enabled"), row.getObject("daily_time", LocalTime.class),
                row.getBoolean("rescue_enabled"), row.getObject("rescue_time", LocalTime.class));
    }
}
