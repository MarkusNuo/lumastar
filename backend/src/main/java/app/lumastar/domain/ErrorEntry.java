package app.lumastar.domain;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/** One logged wrong answer, as exported in {@code recent_errors.json} (PRD 8.3). */
public record ErrorEntry(
        Instant at,
        String exerciseId,
        ExerciseType exerciseType,
        List<SkillTag> skillTags,
        ErrorCategory category,
        String prompt,
        String expected,
        String given) {

    public ErrorEntry {
        Objects.requireNonNull(at, "at");
        Require.notBlank(exerciseId, "exerciseId");
        Objects.requireNonNull(exerciseType, "exerciseType");
        skillTags = List.copyOf(skillTags);
        Objects.requireNonNull(category, "category");
    }
}
