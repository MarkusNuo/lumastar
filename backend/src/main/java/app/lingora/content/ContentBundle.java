package app.lingora.content;

import app.lingora.domain.Curriculum;
import app.lingora.domain.Exercise;
import app.lingora.domain.SkillTagDefinition;
import java.util.List;

/** Validated content of the {@code /content} directory, ready to be seeded. */
public record ContentBundle(Curriculum curriculum, List<SkillTagDefinition> skillTags, List<Exercise> placementExercises) {

    public ContentBundle {
        skillTags = List.copyOf(skillTags);
        placementExercises = List.copyOf(placementExercises);
    }
}
