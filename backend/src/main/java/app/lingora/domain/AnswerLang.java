package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Language of a text the learner reads or writes: Gheg Albanian ({@code sq}) or German ({@code de}). */
public enum AnswerLang implements Coded {
    GHEG("sq"),
    GERMAN("de");

    private final String code;

    AnswerLang(String code) {
        this.code = code;
    }

    public static AnswerLang fromCode(String code) {
        return Coded.fromCode(AnswerLang.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
