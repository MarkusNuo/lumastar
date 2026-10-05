package app.lingora.api.lesson;

import app.lingora.api.auth.AccountService;
import app.lingora.api.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/checkpoints")
@Tag(name = "checkpoints", description = "The test at the end of a stage; passing it moves the learner up")
public class CheckpointController {

    private final LessonService lessons;
    private final AccountService accounts;

    CheckpointController(LessonService lessons, AccountService accounts) {
        this.lessons = lessons;
        this.accounts = accounts;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "startCheckpoint", summary = "Compose and start the checkpoint of a stage",
            description = "Up to 15 exercises from all units of the stage, harder ones first. It is played like any lesson "
                    + "(POST /api/lessons/{sessionId}/attempts, POST /api/lessons/{sessionId}/complete); the result tells "
                    + "whether it is passed (accuracy at least 80 %), the new level and the level badges earned.")
    @ApiResponse(responseCode = "201", description = "The checkpoint (kind checkpoint)")
    @ApiResponse(responseCode = "400", description = "Invalid request", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "The plan has no such stage (code checkpoint_not_found)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Units of the stage are still to do, or it is passed already "
            + "(codes checkpoint_locked, checkpoint_passed)", content = @Content(mediaType = "application/problem+json",
            schema = @Schema(implementation = ProblemDetail.class)))
    public LessonResponse startCheckpoint(@AuthenticationPrincipal AuthenticatedUser principal,
                                          @Valid @RequestBody StartCheckpointRequest body) {
        return lessons.startCheckpoint(accounts.current(principal), body.level());
    }
}
