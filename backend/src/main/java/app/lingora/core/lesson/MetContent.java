package app.lingora.core.lesson;

import app.lingora.domain.Level;
import java.util.Collection;
import java.util.Comparator;
import java.util.Objects;
import java.util.Optional;

/**
 * The highest level whose exercises may practise content the learner has met already (PRD F7, F8): items with an FSRS
 * card and the skill tags of a lesson's mistakes. It is the learner's level, unless no exercise up to it practises the
 * content, e.g. when it was met before a re-placement downwards. Then it is the lowest level with exercises of the
 * content, so that a due card never stays out of reach and practice is never harder than what the content was met with.
 */
public final class MetContent {

    private MetContent() {
    }

    /**
     * @param exerciseLevels the levels of the exercises that practise the content
     * @return empty when no exercise practises the content
     */
    public static Optional<Level> maxLevel(Level learnerLevel, Collection<Level> exerciseLevels) {
        Objects.requireNonNull(learnerLevel, "learnerLevel");
        return exerciseLevels.stream()
                .min(Comparator.naturalOrder())
                .map(lowest -> lowest.isAbove(learnerLevel) ? lowest : learnerLevel);
    }
}
