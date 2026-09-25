package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** FSRS rating, derived automatically from the evaluation (PRD F8). */
public enum Rating implements Coded {
    AGAIN("again"),
    HARD("hard"),
    GOOD("good"),
    EASY("easy");

    private final String code;

    Rating(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
