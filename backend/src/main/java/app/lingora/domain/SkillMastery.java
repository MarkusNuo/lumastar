package app.lingora.domain;

import java.time.Instant;
import java.util.Map;

/** Mastery (0–1) per skill tag of one learner. Tags without an entry have not been practised yet. */
public record SkillMastery(Map<SkillTag, Entry> entries) {

    public SkillMastery {
        entries = Map.copyOf(entries);
    }

    /** {@code lastPracticed} is {@code null} for a value estimated by the placement test only. */
    public record Entry(double mastery, int attempts, int correct, Instant lastPracticed) {

        public Entry {
            Require.that(mastery >= 0 && mastery <= 1, "mastery must be between 0 and 1, found %s", mastery);
            Require.that(attempts >= 0 && correct >= 0 && correct <= attempts,
                    "correct (%d) must be between 0 and attempts (%d)", correct, attempts);
        }
    }
}
