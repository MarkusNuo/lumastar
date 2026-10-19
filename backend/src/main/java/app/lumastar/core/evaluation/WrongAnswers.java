package app.lumastar.core.evaluation;

import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.ErrorHint;
import app.lumastar.domain.Exercise;
import java.util.Optional;

/** Error category and hint of a wrong answer from the exercise metadata (PRD F6, phase 1 rules). */
final class WrongAnswers {

    private WrongAnswers() {
    }

    /** The first error hint whose pattern matches the normalised answer (diacritics kept). */
    static Optional<ErrorHint> matchingHint(Exercise exercise, String normalizedAnswer) {
        return exercise.errorHints().stream().filter(hint -> hint.matches(normalizedAnswer)).findFirst();
    }

    /** The category of the exercise's grammar skill tag, or {@code fallback} if none maps to a category. */
    static ErrorCategory categoryFromSkillTags(Exercise exercise, ErrorCategory fallback) {
        return SkillTagErrorCategories.of(exercise.skillTags()).orElse(fallback);
    }
}
