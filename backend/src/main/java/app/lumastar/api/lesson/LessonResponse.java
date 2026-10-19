package app.lumastar.api.lesson;

import app.lumastar.domain.Exercise;
import app.lumastar.domain.Level;
import app.lumastar.domain.SkillTag;
import app.lumastar.persistence.LessonSessionEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

@Schema(description = "A started lesson; its exercises are in the order they are played")
public record LessonResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID sessionId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LessonKind kind,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The unit or focus unit played; review for a "
                + "review lesson, checkpoint_<level> (e.g. checkpoint_A1.2) for a checkpoint, practice_<skill tag> (e.g. "
                + "practice_grammar.case) for a practice lesson") String unitId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<LessonExercise> exercises) {

    static final String REVIEW_UNIT_ID = "review";

    static String checkpointUnitId(Level level) {
        return "checkpoint_" + level.code();
    }

    static String practiceUnitId(SkillTag tag) {
        return "practice_" + tag.id();
    }

    static LessonResponse of(LessonSessionEntity session, String unitId, List<Exercise> exercises) {
        return new LessonResponse(session.getId(), LessonKind.of(session.getKind()), unitId,
                exercises.stream().map(LessonExercise::of).toList());
    }
}
