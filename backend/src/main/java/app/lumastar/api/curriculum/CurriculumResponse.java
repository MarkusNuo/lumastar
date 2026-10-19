package app.lumastar.api.curriculum;

import app.lumastar.domain.Level;
import app.lumastar.domain.UnitColor;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** The learning path: stages in level order, each with its units in path order. */
public record CurriculumResponse(@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<Stage> stages) {

    @Schema(name = "CurriculumStage")
    public record Stage(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level level,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<Unit> units) {
    }

    @Schema(name = "CurriculumUnit")
    public record Unit(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String id,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            String description,
            @Schema(description = "Banner colour; the frontend maps it to a design token") UnitColor color,
            @Schema(description = "Free icon key; the frontend falls back to a default icon") String icon,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<String> skillTags,
            Integer estimatedLessons,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                    description = "false for skeleton units whose exercises are not written yet; they cannot be started")
            boolean hasContent) {
    }
}
