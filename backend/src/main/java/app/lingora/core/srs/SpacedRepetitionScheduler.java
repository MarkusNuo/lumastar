package app.lingora.core.srs;

import app.lingora.domain.Rating;
import app.lingora.domain.SrsCard;
import java.time.Instant;

/** Schedules the next review of an item; wraps the FSRS library so it stays replaceable (PRD F8). */
public interface SpacedRepetitionScheduler {

    SrsCard review(SrsCard card, Rating rating, Instant now);
}
