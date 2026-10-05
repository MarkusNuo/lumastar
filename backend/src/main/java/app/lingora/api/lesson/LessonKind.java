package app.lingora.api.lesson;

import app.lingora.persistence.SessionKind;
import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "lesson of a unit, focus lesson on a weak skill tag (PRD F3), review of due items (PRD F8), "
        + "checkpoint at the end of a stage (PRD chapter 5) or practice lesson on a chosen skill tag (PRD F10)")
public enum LessonKind {
    LESSON("lesson"),
    FOCUS("focus"),
    REVIEW("review"),
    CHECKPOINT("checkpoint"),
    PRACTICE("practice");

    private final String code;

    LessonKind(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    static LessonKind of(SessionKind kind) {
        return switch (kind) {
            case LESSON -> LESSON;
            case FOCUS -> FOCUS;
            case REVIEW -> REVIEW;
            case CHECKPOINT -> CHECKPOINT;
            case PRACTICE -> PRACTICE;
        };
    }
}
