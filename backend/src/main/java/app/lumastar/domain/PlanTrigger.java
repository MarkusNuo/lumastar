package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * What caused a plan revision (after a checkpoint, after a re-placement, every 7 learning days and after units were
 * added to or retired from the course).
 */
public enum PlanTrigger implements Coded {
    PLACEMENT("placement"),
    CHECKPOINT("checkpoint"),
    PERIODIC("periodic"),
    LESSON("lesson"),
    /** A change the learner made, e.g. of the daily goal. */
    MANUAL("manual"),
    /** Units added to or retired from the course content. */
    CONTENT("content");

    private final String code;

    PlanTrigger(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
