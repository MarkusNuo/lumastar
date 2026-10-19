package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** What caused a plan revision (PRD F3: after a checkpoint, after a re-placement and every 7 learning days). */
public enum PlanTrigger implements Coded {
    PLACEMENT("placement"),
    CHECKPOINT("checkpoint"),
    PERIODIC("periodic"),
    LESSON("lesson"),
    /** A change the learner made, e.g. of the daily goal. */
    MANUAL("manual");

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
