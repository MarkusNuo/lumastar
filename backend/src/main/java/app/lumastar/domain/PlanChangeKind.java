package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Kind of an entry in the plan history (table {@code plan_changes}). */
public enum PlanChangeKind implements Coded {
    PLAN_CREATED("plan_created"),
    FOCUS_INSERTED("focus_inserted"),
    UNIT_SKIPPED("unit_skipped"),
    UNIT_SHORTENED("unit_shortened"),
    LEVEL_CHANGED("level_changed"),
    REPLANNED("replanned");

    private final String code;

    PlanChangeKind(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
