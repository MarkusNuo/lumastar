package app.lumastar.core.mastery;

import app.lumastar.domain.Outcome;
import java.time.Duration;
import java.util.Objects;

/**
 * Parameters of the mastery rule, see {@link MasteryCalculator}. {@code halfLife} is the time without practice after
 * which the effective mastery of a skill tag has halved.
 */
public record MasteryRules(double almostCorrectScore, double retryWeight, double minLearningRate, Duration halfLife) {

    public static final MasteryRules DEFAULT = new MasteryRules(0.6, 0.3, 0.15, Duration.ofDays(60));

    public MasteryRules {
        requireFraction(almostCorrectScore, "almostCorrectScore");
        requireFraction(retryWeight, "retryWeight");
        requireFraction(minLearningRate, "minLearningRate");
        Objects.requireNonNull(halfLife, "halfLife");
        if (!halfLife.isPositive()) {
            throw new IllegalArgumentException("halfLife must be positive, found " + halfLife);
        }
    }

    /** Correct answers and Standard forms score 1, almost correct ones {@link #almostCorrectScore()}, wrong ones 0. */
    public double score(Outcome outcome) {
        return switch (outcome) {
            case CORRECT, CORRECT_STANDARD_FORM -> 1.0;
            case ALMOST_CORRECT -> almostCorrectScore;
            case WRONG -> 0.0;
        };
    }

    private static void requireFraction(double value, String name) {
        if (!(value > 0 && value <= 1)) {
            throw new IllegalArgumentException("%s must be in (0, 1], found %s".formatted(name, value));
        }
    }
}
