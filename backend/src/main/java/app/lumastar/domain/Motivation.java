package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Why the learner studies Gheg (PRD F1), with the German option text; it later steers the vocabulary focus. */
public enum Motivation implements Coded {
    FAMILY("family", "Familie/Partner"),
    TRAVEL("travel", "Reisen"),
    WORK("work", "Beruf"),
    HERITAGE("heritage", "Herkunft"),
    INTEREST("interest", "Interesse");

    private final String code;
    private final String label;

    Motivation(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public static Motivation fromCode(String code) {
        return Coded.fromCode(Motivation.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }

    public String label() {
        return label;
    }
}
