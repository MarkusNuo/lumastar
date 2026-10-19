package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Result class of an evaluated answer (PRD F5 tolerant checking, chapter 4 standard forms). */
public enum Outcome implements Coded {
    CORRECT("correct"),
    /** Accepted, but with a typo such as a missing diacritic or circumflex. */
    ALMOST_CORRECT("almost_correct"),
    /** Accepted without penalty, but a Standard Albanian instead of a Gheg form was used. */
    CORRECT_STANDARD_FORM("correct_standard_form"),
    WRONG("wrong");

    private final String code;

    Outcome(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }

    public boolean isAccepted() {
        return this != WRONG;
    }
}
