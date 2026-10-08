package app.lingora.api.streak;

import app.lingora.api.auth.AccountService;
import app.lingora.api.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.time.YearMonth;
import java.util.Optional;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/streak")
@Tag(name = "streak", description = "Streak screen and streak goal")
public class StreakController {

    private final StreakService streaks;
    private final AccountService accounts;

    StreakController(StreakService streaks, AccountService accounts) {
        this.streaks = streaks;
        this.accounts = accounts;
    }

    @GetMapping
    @Operation(operationId = "getStreak", summary = "The streak, its freezes, one month of the streak calendar and the "
            + "streak goal", description = "For the streak screen behind the flame of the top bar. Any month can be "
            + "asked for; months before the first streak day and months to come have no days.")
    @ApiResponse(responseCode = "200", description = "The streak")
    @ApiResponse(responseCode = "400", description = "The month is not of the form YYYY-MM (code bad_request)", content =
            @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public StreakOverviewResponse getStreak(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Parameter(description = "The calendar month; the current month in the learner's time zone if absent",
                    example = "2026-10")
            @RequestParam(required = false) @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])") String month) {
        return streaks.overview(accounts.current(principal), Optional.ofNullable(month).map(YearMonth::parse));
    }

    @PutMapping("/goal")
    @Operation(operationId = "updateStreakGoal", summary = "Choose the streak goal",
            description = "Once the goal is reached, only one of its options; before, any rung of the goal ladder above "
                    + "the current streak, so that the goal can be changed.")
    @ApiResponse(responseCode = "200", description = "The new goal")
    @ApiResponse(responseCode = "400", description = "The goal cannot be chosen now (code invalid_streak_goal) or is "
            + "missing (code validation_failed)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public StreakGoalResponse updateStreakGoal(@AuthenticationPrincipal AuthenticatedUser principal,
                                               @Valid @RequestBody StreakGoalRequest body) {
        return streaks.chooseGoal(accounts.current(principal), body.target());
    }
}
