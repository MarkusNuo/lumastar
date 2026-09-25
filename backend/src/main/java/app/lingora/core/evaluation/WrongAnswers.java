package app.lingora.core.evaluation;

import app.lingora.domain.ErrorCategory;
import app.lingora.domain.ErrorHint;
import app.lingora.domain.Exercise;
import java.util.Optional;
import java.util.regex.Pattern;

/** Error category and hint of a wrong answer from the exercise metadata (PRD F6, phase 1 rules). */
final class WrongAnswers {

    private static final int HINT_FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS;

    private WrongAnswers() {
    }

    /** The first error hint whose pattern matches the normalised answer (diacritics kept). */
    static Optional<ErrorHint> matchingHint(Exercise exercise, String normalizedAnswer) {
        return exercise.errorHints().stream()
                .filter(hint -> Pattern.compile(hint.pattern(), HINT_FLAGS).matcher(normalizedAnswer).find())
                .findFirst();
    }

    /** The category of the exercise's grammar skill tag, or {@code fallback} if none maps to a category. */
    static ErrorCategory categoryFromSkillTags(Exercise exercise, ErrorCategory fallback) {
        return SkillTagErrorCategories.of(exercise.skillTags()).orElse(fallback);
    }
}
