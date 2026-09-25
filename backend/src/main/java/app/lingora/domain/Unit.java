package app.lingora.domain;

import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Thematic block of the curriculum. Skeleton units (B1–C2 in the MVP) have title, goals and tags but no
 * exercises yet. {@code description}, {@code color}, {@code icon} and {@code estimatedLessons} are {@code null}
 * when absent.
 */
public record Unit(
        String id,
        Level level,
        String title,
        String description,
        List<String> goals,
        List<SkillTag> skillTags,
        UnitColor color,
        String icon,
        Integer estimatedLessons,
        List<GrammarNote> grammar,
        List<Item> items,
        List<Exercise> exercises) {

    private static final Pattern ID_FORMAT = Pattern.compile("^[a-z][a-z0-9_]*$");

    public Unit {
        Require.that(id != null && ID_FORMAT.matcher(id).matches(), "invalid unit id '%s'", id);
        Objects.requireNonNull(level, "level of unit " + id);
        Require.notBlank(title, "title of unit " + id);
        goals = Require.listOrEmpty(goals);
        skillTags = Require.listOrEmpty(skillTags);
        Require.distinct(skillTags, "skillTags of unit " + id);
        Require.that(estimatedLessons == null || estimatedLessons > 0,
                "estimatedLessons of unit %s must be positive", id);
        grammar = Require.listOrEmpty(grammar);
        items = Require.listOrEmpty(items);
        exercises = Require.listOrEmpty(exercises);
        Require.distinct(items.stream().map(Item::id).toList(), "item ids of unit " + id);
        Require.distinct(exercises.stream().map(Exercise::id).toList(), "exercise ids of unit " + id);
    }

    public boolean isSkeleton() {
        return exercises.isEmpty();
    }
}
