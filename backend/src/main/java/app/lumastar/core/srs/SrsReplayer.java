package app.lumastar.core.srs;

import app.lumastar.domain.Rating;
import app.lumastar.domain.SrsCard;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Rebuilds every card from the review log: a change of the FSRS version or of the learner's settings needs
 * nothing but a replay of the logged ratings in their order. A card starts new at its first review.
 */
public final class SrsReplayer {

    private SrsReplayer() {
    }

    /** One logged review: what was rated, how and when. */
    public record LoggedReview(String itemId, Rating rating, Instant reviewedAt) {

        public LoggedReview {
            Objects.requireNonNull(itemId, "itemId");
            Objects.requireNonNull(rating, "rating");
            Objects.requireNonNull(reviewedAt, "reviewedAt");
        }
    }

    /** A review with the card states it leads to under the replaying scheduler. */
    public record ReplayedReview(LoggedReview review, SrsCard before, SrsCard after) {
    }

    /**
     * @param cards   the resulting card per item id
     * @param reviews the reviews in replay order
     */
    public record Replay(Map<String, SrsCard> cards, List<ReplayedReview> reviews) {

        public Replay {
            cards = Collections.unmodifiableMap(new LinkedHashMap<>(cards));
            reviews = List.copyOf(reviews);
        }
    }

    /** Replays the log in the order of the review times; reviews at the same time keep their log order. */
    public static Replay replay(List<LoggedReview> log, SpacedRepetitionScheduler scheduler) {
        Map<String, SrsCard> cards = new LinkedHashMap<>();
        List<ReplayedReview> replayed = new ArrayList<>();
        for (LoggedReview review : log.stream().sorted(Comparator.comparing(LoggedReview::reviewedAt)).toList()) {
            SrsCard before = cards.getOrDefault(review.itemId(), SrsCard.newCard(review.itemId(), review.reviewedAt()));
            SrsCard after = scheduler.review(before, review.rating(), review.reviewedAt());
            cards.put(review.itemId(), after);
            replayed.add(new ReplayedReview(review, before, after));
        }
        return new Replay(cards, replayed);
    }
}
