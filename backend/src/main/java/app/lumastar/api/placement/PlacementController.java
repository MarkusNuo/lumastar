package app.lumastar.api.placement;

import app.lumastar.api.auth.AccountService;
import app.lumastar.api.auth.AuthenticatedUser;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/placement")
@Tag(name = "placement", description = "Adaptive placement test: start, answer item by item, result; skip for beginners")
public class PlacementController {

    private final PlacementService placement;
    private final AccountService accounts;

    PlacementController(PlacementService placement, AccountService accounts) {
        this.placement = placement;
        this.accounts = accounts;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "startPlacement", summary = "Start a placement test",
            description = "Starts at the current level, or at the self-assessed level before the first placement. An "
                    + "unfinished test is abandoned. Also used for \"Neu einstufen\" at any time later (PRD F2).")
    @ApiResponse(responseCode = "201", description = "The test with its first item")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Onboarding questions not answered yet or no placement items "
            + "(codes onboarding_incomplete, placement_unavailable)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public StartPlacementResponse startPlacement(@AuthenticationPrincipal AuthenticatedUser principal) {
        return placement.start(accountId(principal));
    }

    @PostMapping("/{testId}/answers")
    @Operation(operationId = "answerPlacementItem", summary = "Answer the current item and get the next one",
            description = "No verdict and no solution: the test gives no feedback. When the test is over the learner is "
                    + "placed: level, initial mastery, onboarding completed, learning plan created or revised.")
    @ApiResponse(responseCode = "200", description = "The next item, or finished")
    @ApiResponse(responseCode = "400", description = "Invalid request", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Unknown test (code placement_not_found)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "The test is over or was abandoned (code placement_finished)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "422", description = "Not the item shown or answer field not fitting its type "
            + "(codes unexpected_placement_item, answer_type_mismatch)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PlacementAnswerResponse answerPlacementItem(@AuthenticationPrincipal AuthenticatedUser principal,
                                                       @PathVariable UUID testId,
                                                       @Valid @RequestBody PlacementAnswerRequest body) {
        return placement.answer(accountId(principal), testId, body);
    }

    @GetMapping("/{testId}/result")
    @Operation(operationId = "getPlacementResult", summary = "Result of a completed or skipped test")
    @ApiResponse(responseCode = "200", description = "Level, strengths, weaknesses and competences")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Unknown test (code placement_not_found)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Still running or abandoned (code placement_not_finished)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PlacementResultResponse getPlacementResult(@AuthenticationPrincipal AuthenticatedUser principal,
                                                      @PathVariable UUID testId) {
        return placement.result(accountId(principal), testId);
    }

    @PostMapping("/skip")
    @Operation(operationId = "skipPlacement", summary = "Skip the first placement test and start at A0",
            description = "Only for the self-assessment \"Ich kann kein Wort\" before the first placement (PRD F1).")
    @ApiResponse(responseCode = "200", description = "The result of the skipped test (level A0)")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Skipping is not allowed (code placement_not_skippable)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PlacementResultResponse skipPlacement(@AuthenticationPrincipal AuthenticatedUser principal) {
        return placement.skip(accountId(principal));
    }

    /** A session whose account no longer exists counts as not signed in. */
    private UUID accountId(AuthenticatedUser principal) {
        return accounts.current(principal).getId();
    }
}
