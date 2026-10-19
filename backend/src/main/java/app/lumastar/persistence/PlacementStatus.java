package app.lumastar.persistence;

import app.lumastar.domain.Coded;

/** State of a placement test (table {@code placement_tests}); starting a new test abandons an unfinished one. */
public enum PlacementStatus implements Coded {
    IN_PROGRESS("in_progress"),
    COMPLETED("completed"),
    SKIPPED("skipped"),
    ABANDONED("abandoned");

    private final String code;

    PlacementStatus(String code) {
        this.code = code;
    }

    @Override
    public String code() {
        return code;
    }
}
