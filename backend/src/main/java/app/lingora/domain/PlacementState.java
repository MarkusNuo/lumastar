package app.lingora.domain;

import java.util.List;
import java.util.Objects;

/** Progress of an adaptive placement test (PRD F2): where it started, where it is and what was answered. */
public record PlacementState(Level startLevel, Level currentLevel, List<Step> steps) {

    public PlacementState {
        Objects.requireNonNull(startLevel, "startLevel");
        Objects.requireNonNull(currentLevel, "currentLevel");
        steps = List.copyOf(steps);
    }

    public record Step(String exerciseId, Level level, Outcome outcome) {

        public Step {
            Require.notBlank(exerciseId, "exerciseId");
            Objects.requireNonNull(level, "level");
            Objects.requireNonNull(outcome, "outcome");
        }
    }
}
