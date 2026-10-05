package app.lingora.api.lesson;

import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "lesson: a lesson of a unit or focus unit (unitId); practice: a practice lesson of the exercises "
        + "with one skill tag (skillTag, PRD F10 \"Gezielt üben\")")
public enum StartLessonKind {
    LESSON("lesson"),
    PRACTICE("practice");

    private final String code;

    StartLessonKind(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }
}
