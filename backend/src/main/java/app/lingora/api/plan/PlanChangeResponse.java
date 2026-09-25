package app.lingora.api.plan;

import app.lingora.domain.PlanChangeKind;
import app.lingora.domain.PlanTrigger;
import app.lingora.persistence.LearningPlanStore.LoggedChange;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "One entry of the plan history (PRD F3)")
public record PlanChangeResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant changedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The plan version the change led to")
        int planVersion,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) PlanChangeKind type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) PlanTrigger trigger,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "German reason, e.g. \"Fokus-Lektion "
                + "‚Infinitiv me + Partizip‘ eingefügt, Fehlerquote 45 %\"") String reason) {

    static PlanChangeResponse of(LoggedChange change) {
        return new PlanChangeResponse(change.changedAt(), change.planVersion(), change.kind(), change.trigger(), change.reason());
    }
}
