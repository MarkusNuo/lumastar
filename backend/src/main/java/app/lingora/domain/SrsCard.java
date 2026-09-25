package app.lingora.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * FSRS state of one item for the learner (PRD F8). {@code step}, {@code stability}, {@code difficulty} and
 * {@code lastReview} are {@code null} until the scheduler sets them.
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
}
