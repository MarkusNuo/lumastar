package app.lingora.api.onboarding;

import app.lingora.api.auth.AccountService;
import app.lingora.api.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/onboarding")
@Tag(name = "onboarding", description = "First-start questions: motivation, daily goal and self-assessment")
public class OnboardingController {

    private final OnboardingService onboarding;
    private final AccountService accounts;

    OnboardingController(OnboardingService onboarding, AccountService accounts) {
        this.onboarding = onboarding;
        this.accounts = accounts;
    }

    @GetMapping("/options")
    @Operation(operationId = "getOnboardingOptions", summary = "Answer options of the onboarding questions with German labels")
    @ApiResponse(responseCode = "200", description = "The options")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public OnboardingOptionsResponse options() {
        return OnboardingOptionsResponse.all();
    }

    @PutMapping
    @Operation(operationId = "answerOnboarding", summary = "Save the answers of the onboarding questions",
            description = "Can be sent again later, e.g. to change the daily goal. The onboarding is done once the first "
                    + "placement test is completed or skipped.")
    @ApiResponse(responseCode = "200", description = "Where the placement test starts and whether it may be skipped")
    @ApiResponse(responseCode = "400", description = "Invalid answers (code validation_failed or bad_request)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public OnboardingResponse answerOnboarding(@AuthenticationPrincipal AuthenticatedUser principal,
                                               @Valid @RequestBody OnboardingRequest body) {
        return onboarding.answer(accounts.current(principal).getId(), body);
    }
}
