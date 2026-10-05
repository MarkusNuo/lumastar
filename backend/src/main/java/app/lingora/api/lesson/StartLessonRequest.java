package app.lingora.api.lesson;

import app.lingora.domain.SkillTag;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "A lesson of a unit ({\"unitId\": …}) or a practice lesson on a skill tag "
        + "({\"kind\": \"practice\", \"skillTag\": …})")
@LessonTarget
public record StartLessonRequest(
        @Schema(description = "lesson when absent") StartLessonKind kind,
        @Schema(example = "a1_u01_greetings", description = "Required for kind lesson: a curriculum unit or a focus unit "
                + "of the current plan, as listed by GET /api/path")
        @Size(max = 100) String unitId,
        @Schema(example = "grammar.case", description = "Required for kind practice: the skill tag to practise, e.g. a "
                + "top error of GET /api/stats")
        @Size(max = 100) @Pattern(regexp = SkillTag.FORMAT_REGEX) String skillTag) {

    @JsonIgnore
    public boolean isPractice() {
        return kind == StartLessonKind.PRACTICE;
    }
}
