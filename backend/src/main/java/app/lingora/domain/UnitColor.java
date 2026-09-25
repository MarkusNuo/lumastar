package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Banner colour of a unit on the learning path; the frontend maps each value to a design token. */
public enum UnitColor implements Coded {
    VIOLET("violet"),
    TEAL("teal"),
    SKY("sky"),
    ROSE("rose"),
    AMBER("amber"),
    LIME("lime"),
    INDIGO("indigo"),
    CORAL("coral");

    private final String code;

    UnitColor(String code) {
        this.code = code;
    }

    public static UnitColor fromCode(String code) {
        return Coded.fromCode(UnitColor.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
