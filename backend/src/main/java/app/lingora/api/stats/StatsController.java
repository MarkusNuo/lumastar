package app.lingora.api.stats;

import app.lingora.api.auth.AccountService;
import app.lingora.api.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@Tag(name = "stats", description = "Progress and statistics")
public class StatsController {

    private final StatsService stats;
    private final AccountService accounts;

    StatsController(StatsService stats, AccountService accounts) {
        this.stats = stats;
        this.accounts = accounts;
    }

    @GetMapping
    @Operation(operationId = "getStats", summary = "Level progress, mastery per area, top errors, heatmap and FSRS forecast",
            description = "The statistics screen of PRD F10. Every top error carries the request body of its practice "
                    + "lesson (\"Gezielt üben\") for POST /api/lessons.")
    @ApiResponse(responseCode = "200", description = "The statistics")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public StatsResponse getStats(@AuthenticationPrincipal AuthenticatedUser principal) {
        return stats.stats(accounts.current(principal));
    }
}
