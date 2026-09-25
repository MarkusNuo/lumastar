package app.lingora.api.lesson;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StartLessonRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "a1_u01_greetings",
                description = "A curriculum unit or a focus unit of the current plan, as listed by GET /api/path")
        @NotBlank @Size(max = 100) String unitId) {
}
