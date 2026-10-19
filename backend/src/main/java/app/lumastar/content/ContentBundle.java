package app.lumastar.content;

import app.lumastar.domain.Curriculum;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.SkillTagDefinition;
import java.util.List;

/** Validated content of the {@code /content} directory, ready to be seeded. */
public record ContentBundle(Curriculum curriculum, List<SkillTagDefinition> skillTags, List<Exercise> placementExercises) {

    public ContentBundle {
        skillTags = List.copyOf(skillTags);
        placementExercises = List.copyOf(placementExercises);
    }
}
