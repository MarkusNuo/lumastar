package app.lingora.api.progress;

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
@RequestMapping("/api/progress")
@Tag(name = "progress", description = "Daily goal and streak")
public class ProgressController {

    private final DailyProgress progress;
    private final AccountService accounts;

    ProgressController(DailyProgress progress, AccountService accounts) {
        this.progress = progress;
        this.accounts = accounts;
    }

    @GetMapping("/today")
    @Operation(operationId = "getTodayProgress", summary = "Today's minutes towards the daily goal, XP, lessons and the streak",
            description = "For the daily goal ring and the streak flame of the top bar (PRD 12.3).")
    @ApiResponse(responseCode = "200", description = "Today's progress")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public DailyProgressResponse getTodayProgress(@AuthenticationPrincipal AuthenticatedUser principal) {
        return progress.today(accounts.current(principal));
    }
}
