package app.lingora.api.lesson;

import app.lingora.domain.Exercise;
import app.lingora.domain.Level;
import app.lingora.persistence.LessonSessionEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.UUID;

@Schema(description = "A started lesson; its exercises are in the order they are played")
public record LessonResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID sessionId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LessonKind kind,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The unit or focus unit played; review for a "
                + "review lesson, checkpoint_<level> (e.g. checkpoint_A1.2) for a checkpoint") String unitId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<LessonExercise> exercises) {

    static final String REVIEW_UNIT_ID = "review";

    static String checkpointUnitId(Level level) {
        return "checkpoint_" + level.code();
    }

    static LessonResponse of(LessonSessionEntity session, String unitId, List<Exercise> exercises) {
        return new LessonResponse(session.getId(), LessonKind.of(session.getKind()), unitId,
                exercises.stream().map(LessonExercise::of).toList());
    }
}
