package app.lumastar.core.mastery;

import app.lumastar.domain.Outcome;
import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillMastery.Entry;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Mastery per skill tag (PRD 8.2), a recency-weighted moving average of the answer scores:
 * <ul>
 *   <li>Each answer moves the value by {@code m' = m + α·(score − m)} with the scores of {@link MasteryRules#score}
 *       and {@code α = weight · max(minLearningRate, 1 / (attempts + 2))}: early answers move it quickly, recent ones
 *       always noticeably. The weight is 1 for first answers and {@code retryWeight} for retries at the end of a
 *       lesson; retries are not counted as attempts, like in the lesson accuracy.</li>
 *   <li>The value decays on read without practice: {@code effective = m · 0.5^(timeSinceLastPractice / halfLife)}.
 *       Answers build on the effective value, so a long break is not undone by a single answer.</li>
 * </ul>
 * An unpractised tag starts at 0 unless the placement test has estimated an {@link #initial initial value}.
 */
public final class MasteryCalculator {

    /** The state of a skill tag that has neither been practised nor estimated. */
    public static final Entry UNPRACTISED = new Entry(0, 0, 0, null);

    private final MasteryRules rules;

    public MasteryCalculator(MasteryRules rules) {
        this.rules = rules;
    }

    /** An estimate of the placement test; it counts as not practised, so the first answer still moves it by half. */
    public Entry initial(double estimate) {
        return new Entry(estimate, 0, 0, null);
    }

    public Entry update(Entry current, Outcome outcome, boolean retry, Instant answeredAt) {
        double start = effective(current, answeredAt);
        double weight = retry ? rules.retryWeight() : 1.0;
        double learningRate = weight * Math.max(rules.minLearningRate(), 1.0 / (current.attempts() + 2));
        double mastery = start + learningRate * (rules.score(outcome) - start);
        int attempts = current.attempts() + (retry ? 0 : 1);
        int correct = current.correct() + (!retry && outcome.isAccepted() ? 1 : 0);
        return new Entry(clamp(mastery), attempts, correct, latest(current.lastPracticed(), answeredAt));
    }

    public double effective(Entry entry, Instant now) {
        if (entry.lastPracticed() == null || !now.isAfter(entry.lastPracticed())) {
            return entry.mastery();
        }
        Duration withoutPractice = Duration.between(entry.lastPracticed(), now);
        double halfLives = (double) withoutPractice.toMillis() / rules.halfLife().toMillis();
        return entry.mastery() * Math.pow(0.5, halfLives);
    }

    /** All entries with their decayed values; counts and last practice stay as they are. */
    public SkillMastery effective(SkillMastery mastery, Instant now) {
        return new SkillMastery(mastery.entries().entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey,
                tag -> {
                    Entry entry = tag.getValue();
                    return new Entry(effective(entry, now), entry.attempts(), entry.correct(), entry.lastPracticed());
                })));
    }

    private static Instant latest(Instant lastPracticed, Instant answeredAt) {
        return lastPracticed != null && lastPracticed.isAfter(answeredAt) ? lastPracticed : answeredAt;
    }

    // Guards against rounding just outside [0, 1]; the formula itself never leaves the range.
    private static double clamp(double mastery) {
        return Math.min(1.0, Math.max(0.0, mastery));
    }
}
