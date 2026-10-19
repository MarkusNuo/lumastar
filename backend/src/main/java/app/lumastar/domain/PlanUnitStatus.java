package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Status of a unit in the learning plan (PRD F3, 8.3). */
public enum PlanUnitStatus implements Coded {
    PLANNED("planned"),
    IN_PROGRESS("in_progress"),
    COMPLETED("completed"),
    /** Already mastered (mastery ≥ 0.8); it stays repeatable. */
    SKIPPED("skipped");

    private final String code;

    PlanUnitStatus(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }

    /** Completed and skipped units need no more lessons. */
    public boolean isDone() {
        return this == COMPLETED || this == SKIPPED;
    }
}
