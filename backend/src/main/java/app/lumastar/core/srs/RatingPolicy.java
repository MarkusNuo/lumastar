package app.lumastar.core.srs;

import app.lumastar.core.Durations;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.Rating;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * The automatic FSRS rating of an answer (PRD F8), so that the learner never rates an item:
 * <table>
 *   <tr><th>Answer</th><th>Rating</th></tr>
 *   <tr><td>wrong</td><td>again</td></tr>
 *   <tr><td>almost correct (typo, diacritics), or correct but slower than {@value #SLOW_FACTOR} × the typical
 *       time</td><td>hard</td></tr>
 *   <tr><td>correct, also with a Standard form</td><td>good</td></tr>
 *   <tr><td>correct and faster than {@value #FAST_FACTOR} × the typical time on an item already known (review
 *       state)</td><td>easy</td></tr>
 * </table>
 * The typical time is the learner's median first-attempt response time for the exercise type over the last
 * {@value #RECENT_ANSWERS} answers; with fewer than {@value #MIN_ANSWERS} the speed rules do not apply.
 */
public final class RatingPolicy {

    public static final double SLOW_FACTOR = 2.0;
    public static final double FAST_FACTOR = 0.5;
    public static final int MIN_ANSWERS = 10;
    public static final int RECENT_ANSWERS = 50;

    private RatingPolicy() {
    }

    /** The typical response time of the recent first attempts of one exercise type; empty if there are too few. */
    public static Optional<Duration> typicalTime(List<Duration> recentFirstAttempts) {
        if (recentFirstAttempts.size() < MIN_ANSWERS) {
            return Optional.empty();
        }
        return Optional.of(Durations.median(recentFirstAttempts)).filter(Duration::isPositive);
    }

    public static Rating rate(Outcome outcome, Duration responseTime, Optional<Duration> typicalTime, boolean knownItem) {
        if (outcome == Outcome.WRONG) {
            return Rating.AGAIN;
        }
        if (outcome == Outcome.ALMOST_CORRECT) {
            return Rating.HARD;
        }
        if (typicalTime.isPresent()) {
            double ratio = (double) responseTime.toMillis() / typicalTime.get().toMillis();
            if (ratio > SLOW_FACTOR) {
                return Rating.HARD;
            }
            if (knownItem && ratio < FAST_FACTOR) {
                return Rating.EASY;
            }
        }
        return Rating.GOOD;
    }
}
