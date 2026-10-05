package app.lingora.persistence;

import java.util.Objects;
import java.util.UUID;

/**
 * The completion of a lesson or of a placement test, whose practice time may meet the daily goal (PRD F9);
 * {@link #NONE} when the goal is evaluated for anything else, such as a lowered goal.
 */
public record PracticeCompletion(UUID sessionId, UUID placementTestId) {

    public static final PracticeCompletion NONE = new PracticeCompletion(null, null);

    public PracticeCompletion {
        if (sessionId != null && placementTestId != null) {
            throw new IllegalArgumentException("A completion is either a lesson or a placement test");
        }
    }

    public static PracticeCompletion lesson(UUID sessionId) {
        return new PracticeCompletion(Objects.requireNonNull(sessionId), null);
    }

    public static PracticeCompletion placementTest(UUID placementTestId) {
        return new PracticeCompletion(null, Objects.requireNonNull(placementTestId));
    }
}
