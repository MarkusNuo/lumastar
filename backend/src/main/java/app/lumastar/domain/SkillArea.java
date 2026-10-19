package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Area of a skill tag; it is the first segment of the tag id. The German label names it in the statistics (PRD F10). */
public enum SkillArea implements Coded {
    VOCAB("vocab", "Wortschatz"),
    PHRASE("phrase", "Wendungen"),
    GRAMMAR("grammar", "Grammatik"),
    SPELLING("spelling", "Schreiben"),
    READING("reading", "Lesen");

    private final String code;
    private final String label;

    SkillArea(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public static SkillArea fromCode(String code) {
        return Coded.fromCode(SkillArea.class, code);
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
