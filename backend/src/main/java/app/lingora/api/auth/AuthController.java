package app.lingora.api.auth;

import app.lingora.api.profile.ProfileResponse;
import app.lingora.persistence.UserEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "auth", description = "First-start setup, sign-in and sign-out of the single account")
public class AuthController {

    private final AccountService accounts;
    private final SessionSignIn sessionSignIn;

    AuthController(AccountService accounts, SessionSignIn sessionSignIn) {
        this.accounts = accounts;
        this.sessionSignIn = sessionSignIn;
    }

    @GetMapping("/status")
    @SecurityRequirements
    @Operation(operationId = "getAuthStatus", summary = "Whether setup is required and whether the caller is signed in",
            description = "Public. Also issues the XSRF-TOKEN cookie that unsafe requests must echo in X-XSRF-TOKEN.")
    public AuthStatusResponse status(@AuthenticationPrincipal AuthenticatedUser principal) {
        return accounts.find(principal)
                .map(user -> new AuthStatusResponse(false, true, user.getDisplayName()))
                .orElseGet(() -> new AuthStatusResponse(!accounts.isSetUp(), false, null));
    }

    @PostMapping("/setup")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirements
    @Operation(operationId = "setupAccount", summary = "Create the only account of this instance and sign in")
    @ApiResponse(responseCode = "201", description = "Account created; the session cookie is set")
    @ApiResponse(responseCode = "400", description = "Invalid display name or password", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "An account already exists", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ProfileResponse setup(@Valid @RequestBody SetupRequest body, HttpServletRequest request, HttpServletResponse response) {
        UserEntity user = accounts.createAccount(body.displayName(), body.password());
        sessionSignIn.signIn(user, request, response);
        return ProfileResponse.of(user);
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirements
    @Operation(operationId = "login", summary = "Sign in with the password")
    @ApiResponse(responseCode = "204", description = "Signed in; the session cookie is set")
    @ApiResponse(responseCode = "401", description = "Wrong password", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "429", description = "Too many failed attempts; see the Retry-After header", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public void login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        UserEntity user = accounts.authenticate(body.password(), request.getRemoteAddr());
        sessionSignIn.signIn(user, request, response);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "logout", summary = "Sign out and end the session")
    @ApiResponse(responseCode = "204", description = "Signed out")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public void logout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        sessionSignIn.signOut(authentication, request, response);
    }
}
