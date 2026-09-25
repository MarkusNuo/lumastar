package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Learning state of an FSRS card; {@link #NEW} means it has never been reviewed. */
public enum CardState implements Coded {
    NEW("new"),
    LEARNING("learning"),
    REVIEW("review"),
    RELEARNING("relearning");

    private final String code;

    CardState(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
