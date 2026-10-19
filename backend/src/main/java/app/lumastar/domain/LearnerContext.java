package app.lumastar.domain;

import java.util.List;
import java.util.Objects;

/**
 * Compact snapshot handed to an AI provider instead of the database (PRD 10.1): the profile documents plus the
 * Gheg language guide. {@code plan} is {@code null} before the first plan exists.
 */
public record LearnerContext(
        LearnerProfile profile,
        SkillMastery mastery,
        List<ErrorEntry> recentErrors,
        LearningPlan plan,
        String languageGuide) {

    public LearnerContext {
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(mastery, "mastery");
        recentErrors = List.copyOf(recentErrors);
        Require.notBlank(languageGuide, "languageGuide");
    }
}
