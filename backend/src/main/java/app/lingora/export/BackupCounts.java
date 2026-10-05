package app.lingora.export;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;

/** Rows per learner table, as listed in {@code manifest.json} and returned by an import. */
@Schema(description = "Rows per learner table")
public record BackupCounts(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int streaks,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int fsrsParams,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int learningPlans,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int planChanges,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int placementTests,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int placementAnswers,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Lessons") int sessions,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Level badges") int badges,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Answers") int attempts,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int skillMastery,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int srsCards,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int reviewLog) {

    /** From the row counts keyed by table name. */
    static BackupCounts of(Map<String, Integer> rowsByTable) {
        return new BackupCounts(rowsByTable.get("streaks"), rowsByTable.get("fsrs_params"), rowsByTable.get("learning_plans"),
                rowsByTable.get("plan_changes"), rowsByTable.get("placement_tests"), rowsByTable.get("placement_answers"),
                rowsByTable.get("sessions"), rowsByTable.get("badges"), rowsByTable.get("attempts"), rowsByTable.get("skill_mastery"),
                rowsByTable.get("srs_cards"), rowsByTable.get("review_log"));
    }
}
