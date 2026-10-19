package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Competence an exercise tests; the placement test covers all four (PRD F2). */
public enum Competence implements Coded {
    VOCABULARY("vocabulary"),
    GRAMMAR("grammar"),
    READING("reading"),
    TRANSLATION("translation");

    private final String code;

    Competence(String code) {
        this.code = code;
    }

    public static Competence fromCode(String code) {
        return Coded.fromCode(Competence.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
