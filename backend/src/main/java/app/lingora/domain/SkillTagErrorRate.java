package app.lingora.domain;

import java.time.Duration;
import java.util.Objects;

/** Wrong first answers of one skill tag within a period (PRD F7 weak spots, F10 statistics). */
public record SkillTagErrorRate(SkillTag tag, int attempts, int wrong) {

    /** The answers of this period make a skill tag weak: weak spots of a lesson (PRD F7), focus units of the plan (F3). */
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
