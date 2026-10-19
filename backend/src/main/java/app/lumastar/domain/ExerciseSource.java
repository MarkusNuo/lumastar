package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Origin of an exercise: authored content files or AI generation (planned AI integration). */
public enum ExerciseSource implements Coded {
    MANUAL("manual"),
    AI("ai");

    private final String code;

    ExerciseSource(String code) {
        this.code = code;
    }

    public static ExerciseSource fromCode(String code) {
        return Coded.fromCode(ExerciseSource.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
