package app.lingora.domain;

import java.util.Objects;

/** Registry entry of a skill tag with its German label. */
public record SkillTagDefinition(SkillTag tag, String label, SkillArea area) {

    public SkillTagDefinition {
        Objects.requireNonNull(tag, "tag");
        Objects.requireNonNull(area, "area");
        Require.notBlank(label, "label of skill tag " + tag);
        Require.that(area == tag.area(), "skill tag %s is registered with area '%s' but its id starts with '%s'",
                tag, area.code(), tag.area().code());
    }
}
