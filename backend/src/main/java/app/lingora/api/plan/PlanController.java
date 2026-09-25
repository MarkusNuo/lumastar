package app.lingora.api.plan;

import app.lingora.api.auth.AccountService;
import app.lingora.api.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "plan", description = "Personal learning plan up to C2, its history and the learning path")
public class PlanController {

    private final PathService path;
    private final AccountService accounts;

    PlanController(PathService path, AccountService accounts) {
        this.path = path;
        this.accounts = accounts;
    }

    @GetMapping("/path")
    @Operation(operationId = "getPath", summary = "The learning path of the home screen",
            description = "Stages from the current level to C2.3 with their units, the live progress per unit and the "
                    + "time estimates. Focus units for weak skill tags sit right after the unit in progress.")
    @ApiResponse(responseCode = "200", description = "The path")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "No plan yet: placement test open (code plan_not_found)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PathResponse getPath(@AuthenticationPrincipal AuthenticatedUser principal) {
        return path.path(accountId(principal));
    }

    @GetMapping("/plan")
    @Operation(operationId = "getPlan", summary = "The current learning plan with its time estimates",
            description = "The plan as calculated (learning_plan.json of PRD 8.3), e.g. for the plan timeline after the "
                    + "placement test.")
    @ApiResponse(responseCode = "200", description = "The plan")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "No plan yet (code plan_not_found)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PlanResponse getPlan(@AuthenticationPrincipal AuthenticatedUser principal) {
        return path.plan(accountId(principal));
    }

    @GetMapping("/plan/changes")
    @Operation(operationId = "getPlanChanges", summary = "The plan history with German reasons",
            description = "Newest plan version first; the changes of one version in the order they were made, "
                    + "starting with its cause.")
    @ApiResponse(responseCode = "200", description = "The history; empty before the first plan")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public List<PlanChangeResponse> getPlanChanges(@AuthenticationPrincipal AuthenticatedUser principal) {
        return path.changes(accountId(principal));
    }

    /** A session whose account no longer exists counts as not signed in. */
    private UUID accountId(AuthenticatedUser principal) {
        return accounts.current(principal).getId();
    }
}
