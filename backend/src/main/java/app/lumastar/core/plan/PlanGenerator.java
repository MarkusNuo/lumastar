package app.lumastar.core.plan;

import app.lumastar.domain.LearnerProfile;
import app.lumastar.domain.LearningPlan;
import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillTagErrorRate;
import java.util.List;

/**
 * Builds and revises the personal learning plan up to C2 (PRD F3). Unlike PRD 10.2, {@link #revise} takes the error
 * rates per skill tag instead of the error log, because weak tags are defined by their share of wrong answers, and the
 * focus units a lesson asked for (PRD F7).
 */
public interface PlanGenerator {

    /** The first plan; {@code profile.currentLevel()} must be set. */
    LearningPlan generate(LearnerProfile profile, SkillMastery mastery);

    /**
     * The plan recalculated from the current state.
     *
     * @param plan          the current plan with the live status of every unit (completed, in progress, …)
     * @param errorRates    error rates per skill tag of the recent answers
     * @param focusRequests focus units suggested by a lesson with many errors on a tag
     */
    LearningPlan revise(LearningPlan plan, LearnerProfile profile, SkillMastery mastery, List<SkillTagErrorRate> errorRates,
                        List<FocusRequest> focusRequests);
}
