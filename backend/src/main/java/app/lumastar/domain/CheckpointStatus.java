package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** State of the checkpoint at the end of a stage. */
public enum CheckpointStatus implements Coded {
    /** Units of the stage are still to do, or the stage has no exercises yet. */
    LOCKED("locked"),
    AVAILABLE("available"),
    PASSED("passed");

    private final String code;

    CheckpointStatus(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
