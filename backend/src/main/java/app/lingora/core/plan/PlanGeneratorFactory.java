package app.lingora.core.plan;

import app.lingora.domain.SkillTag;
import app.lingora.domain.Stage;
import java.util.List;
import java.util.Map;

/**
 * Creates the generator for the current curriculum, which the content seed may change at any start. The German
 * skill tag labels are used in unit titles and reasons.
 */
@FunctionalInterface
public interface PlanGeneratorFactory {

    PlanGenerator create(List<Stage> curriculum, Map<SkillTag, String> skillTagLabels);
}
