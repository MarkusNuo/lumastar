package app.lumastar.api.plan;

import app.lumastar.domain.PlanChangeKind;
import app.lumastar.domain.PlanTrigger;
import app.lumastar.persistence.LearningPlanStore.LoggedChange;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "One entry of the plan history")
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
