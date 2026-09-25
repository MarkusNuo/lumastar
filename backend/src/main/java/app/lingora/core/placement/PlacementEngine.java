package app.lingora.core.placement;

import app.lingora.domain.Exercise;
import app.lingora.domain.PlacementResult;
import app.lingora.domain.PlacementState;

/** Adaptive placement test (PRD F2); rule-based staircase in Phase 1, IRT or AI later. */
public interface PlacementEngine {

    Exercise nextItem(PlacementState state);

    PlacementResult evaluate(PlacementState state);
}
