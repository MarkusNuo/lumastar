package app.lingora.api.lesson;

import app.lingora.api.auth.AccountService;
import app.lingora.api.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lessons")
@Tag(name = "lessons", description = "Lesson player: start a lesson, answer its exercises, finish it with XP")
public class LessonController {

    private final LessonService lessons;
    private final AccountService accounts;

    LessonController(LessonService lessons, AccountService accounts) {
        this.lessons = lessons;
        this.accounts = accounts;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "startLesson", summary = "Compose and start a lesson of a unit",
            description = "The exercises include their solutions and accepted variants so that the app can pre-check "
                    + "answers instantly (PRD 11.2). A focus unit of the current plan (focus_<skill tag>_<n>) is "
                    + "composed of the exercises carrying its skill tag at or below the learner's level.")
    @ApiResponse(responseCode = "201", description = "The lesson with its exercises")
    @ApiResponse(responseCode = "400", description = "Invalid request", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Unknown unit or focus unit not in the plan (code unit_not_found)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "The unit has no exercises yet (code unit_without_content)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public LessonResponse startLesson(@AuthenticationPrincipal AuthenticatedUser principal,
                                      @Valid @RequestBody StartLessonRequest body) {
        return lessons.start(accounts.current(principal), body.unitId());
    }

    @PostMapping("/{sessionId}/attempts")
    @Operation(operationId = "submitAttempt", summary = "Evaluate and record an answer",
            description = "The binding evaluation with error category, hint and FSRS rating. Wrong exercises repeated at "
                    + "the end of the lesson are sent with retry = true.")
    @ApiResponse(responseCode = "200", description = "The evaluation")
    @ApiResponse(responseCode = "400", description = "Invalid request", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Unknown lesson (code lesson_not_found)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Lesson completed, exercise already answered, retried before its "
            + "first answer or retried after a correct answer (codes lesson_completed, exercise_already_answered, "
            + "retry_before_first_attempt, exercise_already_correct)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "422", description = "Exercise not in the lesson or answer field not fitting its type "
            + "(codes exercise_not_in_lesson, answer_type_mismatch)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public AttemptResponse submitAttempt(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID sessionId,
                                         @Valid @RequestBody AttemptRequest body) {
        return lessons.submitAttempt(principal.userId(), sessionId, body);
    }

    @PostMapping("/{sessionId}/complete")
    @Operation(operationId = "completeLesson", summary = "Finish the lesson and award its XP",
            description = "Idempotent: completing a finished lesson again returns the same result without awarding XP twice.")
    @ApiResponse(responseCode = "200", description = "The lesson result")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Unknown lesson (code lesson_not_found)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Not every exercise has been answered (code lesson_incomplete)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public LessonResultResponse completeLesson(@AuthenticationPrincipal AuthenticatedUser principal,
                                               @PathVariable UUID sessionId) {
        return lessons.complete(principal.userId(), sessionId);
    }
}
