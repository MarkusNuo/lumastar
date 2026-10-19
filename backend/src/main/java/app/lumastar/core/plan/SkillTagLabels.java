package app.lumastar.core.plan;

import app.lumastar.domain.SkillTag;
import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

/** German labels of the skill tag registry; an unregistered tag is shown by its id. */
record SkillTagLabels(Map<SkillTag, String> labels) {

    SkillTagLabels {
        labels = Map.copyOf(labels);
    }

    String of(SkillTag tag) {
        return labels.getOrDefault(tag, tag.id());
    }

    String join(Collection<SkillTag> tags) {
        return tags.stream().map(this::of).collect(Collectors.joining(", "));
    }
}
