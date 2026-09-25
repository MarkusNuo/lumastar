package app.lingora.core.plan;

import app.lingora.domain.ErrorEntry;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.SkillMastery;
import java.util.List;

/** Builds and revises the personal learning plan up to C2 (PRD F3). */
public interface PlanGenerator {

    LearningPlan generate(LearnerProfile profile, SkillMastery mastery);

    LearningPlan revise(LearningPlan plan, LearnerProfile profile, SkillMastery mastery, List<ErrorEntry> errors);
}
