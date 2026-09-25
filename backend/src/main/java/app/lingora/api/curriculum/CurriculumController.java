package app.lingora.api.curriculum;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "curriculum", description = "Stages and units of the learning path")
public class CurriculumController {

    private final CurriculumService curriculum;

    CurriculumController(CurriculumService curriculum) {
        this.curriculum = curriculum;
    }

    @GetMapping("/curriculum")
    @Operation(operationId = "getCurriculum", summary = "All stages from A0 to C2.3 with their units")
    @ApiResponse(responseCode = "200", description = "The curriculum")
    @ApiResponse(responseCode = "401", description = "Not signed in",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public CurriculumResponse curriculum() {
        return curriculum.current();
    }
}
