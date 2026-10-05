package app.lingora.persistence;

import app.lingora.core.srs.SrsSettings;
import app.lingora.domain.CardState;
import app.lingora.domain.Coded;
import app.lingora.domain.Rating;
import app.lingora.domain.SrsCard;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

/**
 * Tables {@code srs_cards} and {@code review_log} (PRD F8): the FSRS state per item and every review with the states
 * before and after it, the scheduler version and the target retention, so that the cards can be rebuilt from the log.
 */
@Repository
public class SrsCardStore {

    private static final String CARD_COLUMNS = "item_id, state, step, stability, difficulty, due, last_review, reps, lapses";

    private final JdbcClient jdbc;
    private final JsonMapper json;

    public SrsCardStore(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** The settings a review is scheduled with; {@code fsrsParamsId} is the row of the weights, {@code null} for defaults. */
    public record SchedulerSettings(SrsSettings settings, UUID fsrsParamsId) {
    }

    /** One review as logged; {@code attemptId} is the answer that caused it. */
    public record Review(UUID cardId, UUID attemptId, Rating rating, Instant reviewedAt, int responseMs, SrsCard before,
                         SrsCard after, String schedulerVersion, SchedulerSettings settings) {

        public Review {
            Objects.requireNonNull(cardId, "cardId");
            Objects.requireNonNull(rating, "rating");
            Objects.requireNonNull(reviewedAt, "reviewedAt");
            Objects.requireNonNull(after, "after");
        }
    }

    public record DueCounts(int dueNow, int dueTomorrow, int totalCards) {
    }

    /**
     * The target retention from the learner's settings ({@code requestRetention}, the default outside the accepted
     * range) and the active optimised weights made for {@code schedulerVersion}, if any.
     */
    public SchedulerSettings settings(UUID userId, String schedulerVersion) {
        List<Double> configured = jdbc.sql("""
                        SELECT CASE WHEN jsonb_typeof(settings -> 'requestRetention') = 'number'
                                    THEN (settings ->> 'requestRetention')::float8 END
                        FROM users WHERE id = :user""")
                .param("user", userId)
                .query(Double.class)
                .list();
        Double retention = configured.isEmpty() ? null : configured.getFirst();
        double requestRetention = retention != null && SrsSettings.isValidRetention(retention)
                ? retention
                : SrsSettings.DEFAULT_REQUEST_RETENTION;
        return jdbc.sql("SELECT id, weights FROM fsrs_params WHERE user_id = :user AND active AND scheduler_version = :version")
                .param("user", userId)
                .param("version", schedulerVersion)
                .query((row, rowNumber) -> new SchedulerSettings(new SrsSettings(requestRetention,
                        Arrays.asList((Double[]) row.getArray("weights").getArray())), row.getObject("id", UUID.class)))
                .optional()
                .orElseGet(() -> new SchedulerSettings(new SrsSettings(requestRetention, List.of()), null));
    }

    /** The learner's cards of the items, locked until the end of the transaction; items without a card are missing. */
    public Map<String, SrsCard> lockCards(UUID userId, Collection<String> itemIds) {
        return byItem(jdbc.sql("""
                        SELECT %s FROM srs_cards WHERE user_id = :user AND item_id = ANY (:items)
                        ORDER BY item_id FOR UPDATE""".formatted(CARD_COLUMNS))
                .param("user", userId)
                .param("items", itemIds.toArray(String[]::new))
                .query(SrsCardStore::card)
                .list());
    }

    public Map<String, SrsCard> cards(UUID userId, Collection<String> itemIds) {
        return byItem(jdbc.sql("SELECT %s FROM srs_cards WHERE user_id = :user AND item_id = ANY (:items)".formatted(CARD_COLUMNS))
                .param("user", userId)
                .param("items", itemIds.toArray(String[]::new))
                .query(SrsCardStore::card)
                .list());
    }

    /** Stores the card of its item, created at {@code at} if it is new; returns the card id. */
    public UUID save(UUID userId, SrsCard card, Instant at) {
        return jdbc.sql("""
                        INSERT INTO srs_cards (user_id, %s, created_at)
                        VALUES (:user, :item, :state, :step, :stability, :difficulty, :due, :lastReview, :reps, :lapses, :at)
                        ON CONFLICT (user_id, item_id) DO UPDATE SET state = excluded.state, step = excluded.step,
                            stability = excluded.stability, difficulty = excluded.difficulty, due = excluded.due,
                            last_review = excluded.last_review, reps = excluded.reps, lapses = excluded.lapses
                        RETURNING id""".formatted(CARD_COLUMNS))
                .param("user", userId)
                .param("item", card.itemId())
                .param("state", card.state().code())
                .param("step", card.step())
                .param("stability", card.stability())
                .param("difficulty", card.difficulty())
                .param("due", SqlTimestamps.of(card.due()))
                .param("lastReview", SqlTimestamps.of(card.lastReview()))
                .param("reps", card.reps())
                .param("lapses", card.lapses())
                .param("at", SqlTimestamps.of(at))
                .query(UUID.class)
                .single();
    }

    public void log(UUID userId, Review review) {
        jdbc.sql("""
                        INSERT INTO review_log (user_id, card_id, item_id, attempt_id, rating, reviewed_at, response_ms, state_before,
                                                state_after, scheduler_version, request_retention, fsrs_params_id)
                        VALUES (:user, :card, :item, :attempt, :rating, :reviewedAt, :responseMs, :before::jsonb, :after::jsonb,
                                :version, :retention, :params)""")
                .param("user", userId)
                .param("card", review.cardId())
                .param("item", review.after().itemId())
                .param("attempt", review.attemptId())
                .param("rating", review.rating().code())
                .param("reviewedAt", SqlTimestamps.of(review.reviewedAt()))
                .param("responseMs", review.responseMs())
                .param("before", json.writeValueAsString(state(review.before())))
                .param("after", json.writeValueAsString(state(review.after())))
                .param("version", review.schedulerVersion())
                .param("retention", review.settings().settings().requestRetention())
                .param("params", review.settings().fsrsParamsId())
                .update();
    }

    /** Cards of active items due at {@code now}, most overdue first. */
    public List<SrsCard> dueCards(UUID userId, Instant now, int limit) {
        return jdbc.sql("""
                        SELECT %s FROM srs_cards c
                        WHERE c.user_id = :user AND c.due <= :now
                          AND EXISTS (SELECT 1 FROM content_items i WHERE i.id = c.item_id AND i.retired_at IS NULL)
                        ORDER BY c.due, c.item_id
                        LIMIT :limit""".formatted(CARD_COLUMNS))
                .param("user", userId)
                .param("now", SqlTimestamps.of(now))
                .param("limit", limit)
                .query(SrsCardStore::card)
                .list();
    }

    /** Cards of active items: due at {@code now}, due within {@code [tomorrow, dayAfter)} and in total. */
    public DueCounts dueCounts(UUID userId, Instant now, Instant tomorrow, Instant dayAfter) {
        return jdbc.sql("""
                        SELECT count(*) FILTER (WHERE c.due <= :now) AS due_now,
                               count(*) FILTER (WHERE c.due >= :tomorrow AND c.due < :dayAfter) AS due_tomorrow,
                               count(*) AS total
                        FROM srs_cards c JOIN content_items i ON i.id = c.item_id
                        WHERE c.user_id = :user AND i.retired_at IS NULL""")
                .param("user", userId)
                .param("now", SqlTimestamps.of(now))
                .param("tomorrow", SqlTimestamps.of(tomorrow))
                .param("dayAfter", SqlTimestamps.of(dayAfter))
                .query((row, rowNumber) -> new DueCounts(row.getInt("due_now"), row.getInt("due_tomorrow"), row.getInt("total")))
                .single();
    }

    /** Learned words (PRD F10): words and phrases whose card is in the review state. */
    public int learnedWords(UUID userId) {
        return jdbc.sql("""
                        SELECT count(*) FROM srs_cards c JOIN content_items i ON i.id = c.item_id
                        WHERE c.user_id = :user AND c.state = 'review' AND i.kind IN ('word', 'phrase')""")
                .param("user", userId)
                .query(Integer.class)
                .single();
    }

    /** The card state as logged in {@code state_before} and {@code state_after}. */
    private static Map<String, Object> state(SrsCard card) {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("state", card.state().code());
        state.put("step", card.step());
        state.put("stability", card.stability());
        state.put("difficulty", card.difficulty());
        state.put("due", card.due());
        state.put("lastReview", card.lastReview());
        state.put("reps", card.reps());
        state.put("lapses", card.lapses());
        return state;
    }

    private static Map<String, SrsCard> byItem(List<SrsCard> cards) {
        return cards.stream().collect(Collectors.toMap(SrsCard::itemId, Function.identity(), (first, second) -> first,
                LinkedHashMap::new));
    }

    private static SrsCard card(ResultSet row, int rowNumber) throws SQLException {
        return new SrsCard(row.getString("item_id"), Coded.fromCode(CardState.class, row.getString("state")),
                row.getObject("step", Integer.class), row.getObject("stability", Double.class),
                row.getObject("difficulty", Double.class), SqlTimestamps.instant(row, "due"),
                SqlTimestamps.instant(row, "last_review"), row.getInt("reps"), row.getInt("lapses"));
    }
}
