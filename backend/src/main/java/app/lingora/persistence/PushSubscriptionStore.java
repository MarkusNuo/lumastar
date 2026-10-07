package app.lingora.persistence;

import app.lingora.push.PushSubscription;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Table {@code push_subscriptions}: the browsers and devices that a learner gets reminders on. */
@Repository
public class PushSubscriptionStore {

    private static final String COLUMNS = "id, endpoint, p256dh, auth, label, created_at, last_success_at, failure_count";

    private final JdbcClient jdbc;

    public PushSubscriptionStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** @param label {@code null} if the device has no name */
    public record StoredSubscription(UUID id, PushSubscription subscription, String label, Instant createdAt,
                                     Instant lastSuccessAt, int failureCount) {
    }

    /**
     * Stores the subscription of the learner's device. Its endpoint may be known already: the same device subscribing
     * again keeps its history, while a device another account used before moves to the learner and starts afresh.
     */
    public StoredSubscription save(UUID userId, PushSubscription subscription, String label, Instant at) {
        return jdbc.sql("""
                        INSERT INTO push_subscriptions AS s (user_id, endpoint, p256dh, auth, label, created_at)
                        VALUES (:user, :endpoint, :p256dh, :auth, :label, :at)
                        ON CONFLICT (endpoint) DO UPDATE
                        SET p256dh = excluded.p256dh, auth = excluded.auth, label = excluded.label, failure_count = 0,
                            created_at = CASE WHEN s.user_id = excluded.user_id THEN s.created_at ELSE excluded.created_at END,
                            last_success_at = CASE WHEN s.user_id = excluded.user_id THEN s.last_success_at END,
                            user_id = excluded.user_id
                        RETURNING %s""".formatted(COLUMNS))
                .param("user", userId)
                .param("endpoint", subscription.endpoint())
                .param("p256dh", subscription.p256dh())
                .param("auth", subscription.auth())
                .param("label", label)
                .param("at", SqlTimestamps.of(at))
                .query(PushSubscriptionStore::subscription)
                .single();
    }

    /** The learner's subscriptions, oldest first. */
    public List<StoredSubscription> of(UUID userId) {
        return jdbc.sql("SELECT %s FROM push_subscriptions WHERE user_id = :user ORDER BY created_at, id".formatted(COLUMNS))
                .param("user", userId)
                .query(PushSubscriptionStore::subscription)
                .list();
    }

    /** Deletes the learner's subscription with this endpoint; another learner's is left alone. */
    public boolean delete(UUID userId, String endpoint) {
        return jdbc.sql("DELETE FROM push_subscriptions WHERE user_id = :user AND endpoint = :endpoint")
                .param("user", userId)
                .param("endpoint", endpoint)
                .update() > 0;
    }

    public void recordSuccess(UUID subscriptionId, Instant at) {
        jdbc.sql("UPDATE push_subscriptions SET last_success_at = :at, failure_count = 0 WHERE id = :id")
                .param("at", SqlTimestamps.of(at))
                .param("id", subscriptionId)
                .update();
    }

    public void recordFailure(UUID subscriptionId) {
        jdbc.sql("UPDATE push_subscriptions SET failure_count = failure_count + 1 WHERE id = :id")
                .param("id", subscriptionId)
                .update();
    }

    /** Removes a subscription the push service no longer knows. */
    public void remove(UUID subscriptionId) {
        jdbc.sql("DELETE FROM push_subscriptions WHERE id = :id").param("id", subscriptionId).update();
    }

    private static StoredSubscription subscription(ResultSet row, int rowNumber) throws SQLException {
        return new StoredSubscription(row.getObject("id", UUID.class),
                new PushSubscription(row.getString("endpoint"), row.getString("p256dh"), row.getString("auth")),
                row.getString("label"), SqlTimestamps.instant(row, "created_at"), SqlTimestamps.instant(row, "last_success_at"),
                row.getInt("failure_count"));
    }
}
