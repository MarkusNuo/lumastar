package app.lumastar.core.progress;

import java.time.Duration;

/**
 * Practice time towards the daily goal (PRD F9): the time from the start to the completion of a lesson of any kind or
 * of a placement test. A lesson left open for long counts with at most {@link #MAX_PER_SESSION}.
 */
public final class PracticeTime {

    public static final Duration MAX_PER_SESSION = Duration.ofMinutes(30);

    private PracticeTime() {
    }

    public static Duration counted(Duration session) {
        if (session.isNegative()) {
            return Duration.ZERO;
        }
        return session.compareTo(MAX_PER_SESSION) > 0 ? MAX_PER_SESSION : session;
    }

    /** Whole minutes, rounded down, so that the goal never shows as met before it is. */
    public static int minutes(Duration practised) {
        return Math.toIntExact(practised.toMinutes());
    }
}
