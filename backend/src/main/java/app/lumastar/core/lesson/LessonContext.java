package app.lumastar.core.lesson;

import app.lumastar.domain.LearnerProfile;
import app.lumastar.domain.Level;
import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillTagErrorRate;
import app.lumastar.domain.SrsCard;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * What the composer knows about the learner when a lesson starts (PRD F7).
 *
 * @param dueCards              the cards due now, most overdue first
 * @param recentErrorRates      the error rate per skill tag of the {@link SkillTagErrorRate#RECENT_PERIOD}
 * @param practisedExerciseIds  the exercises the learner has answered before
 * @param recentUnitAccuracies  the accuracy of the last completed lessons of the unit, newest first
 */
public record LessonContext(
        LearnerProfile profile,
        SkillMastery mastery,
        List<SrsCard> dueCards,
        List<SkillTagErrorRate> recentErrorRates,
        Set<String> practisedExerciseIds,
        List<Double> recentUnitAccuracies) {

    /** The lessons of a unit whose accuracy steers the difficulty of the next one (PRD F7). */
    public static final int RECENT_UNIT_LESSONS = 2;

    public LessonContext {
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(mastery, "mastery");
        dueCards = List.copyOf(dueCards);
        recentErrorRates = List.copyOf(recentErrorRates);
        practisedExerciseIds = Set.copyOf(practisedExerciseIds);
        recentUnitAccuracies = List.copyOf(recentUnitAccuracies);
    }

    /** A learner without any history yet. */
    public static LessonContext firstLesson(LearnerProfile profile) {
        return new LessonContext(profile, new SkillMastery(Map.of()), List.of(), List.of(), Set.of(), List.of());
    }

    /**
     * The highest level weak spots and reviews may come from, the learner's or {@code beforePlacement} without one; for
     * items met only above it, reviews go higher (see {@link MetContent}).
     */
    Level maxLevel(Level beforePlacement) {
        return profile.currentLevel() == null ? beforePlacement : profile.currentLevel();
    }
}
