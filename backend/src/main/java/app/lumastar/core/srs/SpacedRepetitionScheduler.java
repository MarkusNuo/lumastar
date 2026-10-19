package app.lumastar.core.srs;

import app.lumastar.domain.Rating;
import app.lumastar.domain.SrsCard;
import java.time.Instant;

/** Schedules the next review of an item; wraps the FSRS library so it stays replaceable. */
public interface SpacedRepetitionScheduler {

    SrsCard review(SrsCard card, Rating rating, Instant now);

    /** Stored with every review, e.g. {@code fsrs-6/java-fsrs-1.0.0}; a change calls for a replay of the review log. */
    String version();
}
