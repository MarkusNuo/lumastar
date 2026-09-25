package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Why the learner studies Gheg (PRD F1); it later steers the vocabulary focus. */
public enum Motivation implements Coded {
    FAMILY("family"),
    TRAVEL("travel"),
    WORK("work"),
    HERITAGE("heritage"),
    INTEREST("interest");

    private final String code;

    Motivation(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
