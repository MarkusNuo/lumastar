package app.lumastar.api.plan;

import app.lumastar.domain.CefrBand;
import app.lumastar.domain.LearningPlan;
import app.lumastar.domain.Level;
import app.lumastar.domain.PlanUnitStatus;
import app.lumastar.persistence.LearningPlanStore.StoredPlan;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Schema(description = "The current plan version as stored (learning_plan.json, PRD 8.3); the statuses are those at "
        + "its calculation, the live progress is in GET /api/path")
public record PlanResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int version,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant validFrom,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant generatedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "rule_based_v1") String generatedBy,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level startLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<PlanStage> stages,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Per CEFR band (A1 … C2) of the plan the expected date by which it is done")
        Map<String, LocalDate> estimates) {

    @Schema(name = "PlanStage")
    public record PlanStage(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level level,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<PlanUnit> units) {
    }

    @Schema(name = "PlanUnit")
    public record PlanUnit(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String unitId,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) PlanUnitStatus status,
            Integer estimatedLessons,
            @Schema(description = "German reason, e.g. \"Fehlerquote 45 % bei Infinitiv me + Partizip\"") String reason,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean focus) {
    }

    static PlanResponse of(StoredPlan stored, Map<Level, String> stageTitles) {
        LearningPlan plan = stored.plan();
        return new PlanResponse(stored.version(), stored.validFrom(), plan.generatedAt(), plan.generatedBy(), plan.startLevel(),
                plan.stages().stream()
                        .map(stage -> new PlanStage(stage.level(), stageTitles.getOrDefault(stage.level(), stage.level().code()),
                                stage.units().stream()
                                        .map(unit -> new PlanUnit(unit.unitId(), unit.title(), unit.status(),
                                                unit.estimatedLessons(), unit.reason(), unit.isFocus()))
                                        .toList()))
                        .toList(),
                estimates(plan.estimates()));
    }

    static Map<String, LocalDate> estimates(Map<CefrBand, LocalDate> estimates) {
        Map<String, LocalDate> byBand = new LinkedHashMap<>();
        estimates.forEach((band, date) -> byBand.put(band.name(), date));
        return byBand;
    }
}
