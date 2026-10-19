package app.lumastar.domain;

import java.util.Map;
import java.util.Objects;

/**
 * One change of the learning plan with its German reason for the plan history (PRD F3), e.g. "Fokus-Lektion
 * ‚Infinitiv me + Partizip‘ eingefügt, Fehlerquote 45 %". {@code details} holds the machine-readable facts.
 */
public record PlanChange(PlanChangeKind kind, String reason, Map<String, Object> details) {

    public PlanChange {
        Objects.requireNonNull(kind, "kind");
        Require.notBlank(reason, "reason");
        details = Map.copyOf(details);
    }

    public static PlanChange of(PlanChangeKind kind, String reason) {
        return new PlanChange(kind, reason, Map.of());
    }
}
