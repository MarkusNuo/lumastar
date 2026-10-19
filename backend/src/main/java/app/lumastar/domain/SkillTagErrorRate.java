package app.lumastar.domain;

import java.time.Duration;
import java.util.Objects;

/** Wrong first answers of one skill tag within a period (weak spots, statistics). */
public record SkillTagErrorRate(SkillTag tag, int attempts, int wrong) {

    /** The answers of this period make a skill tag weak: weak spots of a lesson, focus units of the plan. */
    public static final Duration RECENT_PERIOD = Duration.ofDays(14);

    public SkillTagErrorRate {
        Objects.requireNonNull(tag, "tag");
        Require.that(attempts > 0 && wrong >= 0 && wrong <= attempts,
                "wrong (%d) must be between 0 and attempts (%d)", wrong, attempts);
    }

    public double errorRate() {
        return (double) wrong / attempts;
    }
}
