package app.lumastar.domain;

import java.util.List;
import java.util.Objects;

/** Progress of an adaptive placement test (PRD F2): where it started, where it is and what was answered. */
public record PlacementState(Level startLevel, Level currentLevel, List<Step> steps) {

    public PlacementState {
        Objects.requireNonNull(startLevel, "startLevel");
        Objects.requireNonNull(currentLevel, "currentLevel");
        steps = List.copyOf(steps);
    }

    /**
     * One answered placement item. Skill tags and competence let the evaluation derive the initial mastery per skill
     * tag and check that every competence has been covered.
     */
    public record Step(String exerciseId, Level level, Competence competence, List<SkillTag> skillTags, Outcome outcome) {

        public Step {
            Require.notBlank(exerciseId, "exerciseId");
            Objects.requireNonNull(level, "level");
            Objects.requireNonNull(competence, "competence of placement item " + exerciseId);
            skillTags = Require.listOrEmpty(skillTags);
            Require.notEmpty(skillTags, "skillTags");
            Objects.requireNonNull(outcome, "outcome");
        }
    }
}
