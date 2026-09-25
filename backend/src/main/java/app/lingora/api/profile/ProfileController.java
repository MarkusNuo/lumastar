package app.lingora.api.profile;

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
@RequestMapping("/api")
@Tag(name = "profile", description = "The signed-in learner")
public class ProfileController {

    private final AccountService accounts;

    ProfileController(AccountService accounts) {
        this.accounts = accounts;
    }

    @GetMapping("/me")
    @Operation(operationId = "getMe", summary = "Basic profile of the signed-in learner")
    @ApiResponse(responseCode = "200", description = "The profile")
    @ApiResponse(responseCode = "401", description = "Not signed in",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ProfileResponse me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ProfileResponse.of(accounts.current(principal));
    }
}
