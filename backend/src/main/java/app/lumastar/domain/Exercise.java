package app.lumastar.domain;

import java.util.List;
import java.util.Objects;

/**
 * A single task. Common fields live here, type-specific fields in {@link #payload()}.
 * {@code competence} and {@code note} are {@code null} when absent.
 */
public record Exercise(
        String id,
        Level level,
        int difficulty,
        List<SkillTag> skillTags,
        List<String> itemIds,
        Competence competence,
        Prompt prompt,
        String explanation,
        List<ErrorHint> errorHints,
        ExerciseSource source,
        boolean reviewed,
        String note,
        ExercisePayload payload) {

    public static final int MIN_DIFFICULTY = 1;
    public static final int MAX_DIFFICULTY = 3;

    public Exercise {
        Require.notBlank(id, "exercise id");
        Objects.requireNonNull(level, "level");
        Require.that(difficulty >= MIN_DIFFICULTY && difficulty <= MAX_DIFFICULTY,
                "difficulty must be between %d and %d, found %d", MIN_DIFFICULTY, MAX_DIFFICULTY, difficulty);
        skillTags = Require.listOrEmpty(skillTags);
        Require.notEmpty(skillTags, "skillTags");
        Require.distinct(skillTags, "skillTags");
        itemIds = Require.listOrEmpty(itemIds);
        Require.distinct(itemIds, "itemIds");
        Objects.requireNonNull(prompt, "prompt");
        Require.notBlank(explanation, "explanation");
        errorHints = Require.listOrEmpty(errorHints);
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(payload, "payload");
    }

    public ExerciseType type() {
        return payload.type();
    }
}
