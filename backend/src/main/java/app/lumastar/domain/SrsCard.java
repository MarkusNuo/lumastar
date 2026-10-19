package app.lumastar.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * FSRS state of one item for the learner (PRD F8). {@code step}, {@code stability}, {@code difficulty} and
 * {@code lastReview} are {@code null} until the scheduler sets them; {@code step} is {@code null} again in the review
 * state.
 */
public record SrsCard(
        String itemId,
        CardState state,
        Integer step,
        Double stability,
        Double difficulty,
        Instant due,
        Instant lastReview,
        int reps,
        int lapses) {

    public SrsCard {
        Require.notBlank(itemId, "itemId");
        Objects.requireNonNull(state, "state");
        Objects.requireNonNull(due, "due");
        Require.that(reps >= 0 && lapses >= 0, "reps and lapses must not be negative");
        Require.that(lapses <= reps, "a card cannot lapse more often than it was reviewed");
    }

    /** A card that has never been reviewed, due at once. */
    public static SrsCard newCard(String itemId, Instant due) {
        return new SrsCard(itemId, CardState.NEW, null, null, null, due, null, 0, 0);
    }

    /** In the review state the item counts as learned (PRD F10 "gelernte Wörter"). */
    public boolean isKnown() {
        return state == CardState.REVIEW;
    }
}
