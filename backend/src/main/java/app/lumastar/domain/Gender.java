package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Grammatical gender of a noun. */
public enum Gender implements Coded {
    MASCULINE("m"),
    FEMININE("f"),
    NEUTER("n");

    private final String code;

    Gender(String code) {
        this.code = code;
    }

    public static Gender fromCode(String code) {
        return Coded.fromCode(Gender.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
