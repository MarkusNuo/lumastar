package app.lumastar.core.placement;

import app.lumastar.domain.Exercise;
import app.lumastar.domain.PlacementResult;
import app.lumastar.domain.PlacementState;

/**
 * Adaptive placement test (PRD F2); rule-based staircase in Phase 1, IRT or AI later. Besides the two methods of
 * PRD 10.2 the engine owns the test flow: how an answer moves the test on and when it ends.
 */
public interface PlacementEngine {

    /** The item to show next; only while the test is not {@link #isFinished finished}. */
    Exercise nextItem(PlacementState state);

    /** The state after the learner answered the item of {@code step}. */
    PlacementState record(PlacementState state, PlacementState.Step step);

    boolean isFinished(PlacementState state);

    /** The most items a test can take, e.g. for a progress bar. */
    int maxItems();

    PlacementResult evaluate(PlacementState state);
}
