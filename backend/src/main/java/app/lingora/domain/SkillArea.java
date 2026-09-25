package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Area of a skill tag; it is the first segment of the tag id. */
public enum SkillArea implements Coded {
    VOCAB("vocab"),
    PHRASE("phrase"),
    GRAMMAR("grammar"),
    SPELLING("spelling"),
    READING("reading");

    private final String code;

    SkillArea(String code) {
        this.code = code;
    }

    public static SkillArea fromCode(String code) {
        return Coded.fromCode(SkillArea.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
