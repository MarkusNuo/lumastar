package app.lingora.domain;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Learner settings and progress used by the engines. {@code currentLevel} is {@code null} before placement. */
public record LearnerProfile(
        UUID userId,
        String displayName,
        Set<Motivation> motivations,
        int dailyGoalMinutes,
        Level currentLevel,
        int xpTotal) {

    public LearnerProfile {
        Objects.requireNonNull(userId, "userId");
        Require.notBlank(displayName, "displayName");
        motivations = motivations == null ? Set.of() : Set.copyOf(motivations);
        Require.that(dailyGoalMinutes > 0, "dailyGoalMinutes must be positive");
        Require.that(xpTotal >= 0, "xpTotal must not be negative");
    }
}
