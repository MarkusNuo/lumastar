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
import java.util.UUID;
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
@Tag(name = "auth", description = "Registration, sign-in, e-mail verification and password reset")
public class AuthController {

    private final AccountService accounts;
    private final RegistrationProperties registration;
    private final Registration registrations;
    private final EmailVerification emailVerification;
    private final PasswordReset passwordReset;
    private final SessionSignIn sessionSignIn;
    private final UserSessions sessions;

    AuthController(AccountService accounts, RegistrationProperties registration, Registration registrations,
                   EmailVerification emailVerification, PasswordReset passwordReset, SessionSignIn sessionSignIn,
                   UserSessions sessions) {
        this.accounts = accounts;
        this.registration = registration;
        this.registrations = registrations;
        this.emailVerification = emailVerification;
        this.passwordReset = passwordReset;
        this.sessionSignIn = sessionSignIn;
        this.sessions = sessions;
    }

    @GetMapping("/status")
    @SecurityRequirements
    @Operation(operationId = "getAuthStatus", summary = "Whether the caller is signed in and how one can sign up or in",
            description = "Public. Also issues the XSRF-TOKEN cookie that unsafe requests must echo in X-XSRF-TOKEN.")
    public AuthStatusResponse status(@AuthenticationPrincipal AuthenticatedUser principal) {
        boolean legacyLogin = accounts.legacyLoginAvailable();
        return accounts.find(principal)
                .map(user -> new AuthStatusResponse(true, registration.mode(), legacyLogin, user.getDisplayName(),
                        user.isEmailVerified()))
                .orElseGet(() -> new AuthStatusResponse(false, registration.mode(), legacyLogin, null, null));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @SecurityRequirements
    @Operation(operationId = "register", summary = "Create an account and sign in",
            description = "Sends a mail with a link to /verify-email; the learner can start before opening it.")
    @ApiResponse(responseCode = "201", description = "Account created; the session cookie is set")
    @ApiResponse(responseCode = "400", description = "Invalid fields (code validation_failed)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "registration_closed or invite_code_invalid", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Another account uses the address (code email_taken)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "429", description = "Too many registrations from this client, or the server is busy "
            + "hashing passwords (code too_many_requests); see Retry-After", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ProfileResponse register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request,
                                    HttpServletResponse response) {
        UserEntity user = registrations.register(body, ClientKey.of(request));
        sessionSignIn.signIn(user, request, response);
        return ProfileResponse.of(user);
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirements
    @Operation(operationId = "login", summary = "Sign in with e-mail address and password",
            description = "Failed attempts are throttled per client, per client and address, and per address across "
                    + "clients, alike for addresses with and without an account.")
    @ApiResponse(responseCode = "204", description = "Signed in; the session cookie is set")
    @ApiResponse(responseCode = "401", description = "Wrong address or password (code invalid_credentials)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "429", description = "login_throttled after too many failed attempts, too_many_requests "
            + "while the server is busy checking passwords; see Retry-After", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public void login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        UserEntity user = accounts.authenticate(body.email(), body.password(), ClientKey.of(request));
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

    @PostMapping("/verify-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirements
    @Operation(operationId = "verifyEmail", summary = "Confirm an e-mail address with the token of the mailed link",
            description = "Verifies the address of a new account or completes an e-mail change; no sign-in needed. "
                    + "A link works once.")
    @ApiResponse(responseCode = "204", description = "Address confirmed")
    @ApiResponse(responseCode = "409", description = "Another account took the new address meanwhile (code email_taken)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "410", description = "token_invalid (unknown, used or superseded) or token_expired",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public void verifyEmail(@Valid @RequestBody VerifyEmailRequest body) {
        emailVerification.verify(body.token());
    }

    @PostMapping("/verify-email/resend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "resendVerificationEmail", summary = "Send the verification link again",
            description = "Sends the confirmation of a pending e-mail change again, otherwise the verification of the "
                    + "current address. Earlier links of the same kind stop working.")
    @ApiResponse(responseCode = "204", description = "Mail sent")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "email_already_verified (and no change pending) or email_required",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "429", description = "Too many account mails (code too_many_requests)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public void resendVerificationEmail(@AuthenticationPrincipal AuthenticatedUser principal) {
        emailVerification.resend(principal.userId());
    }

    @PostMapping("/password-reset")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @SecurityRequirements
    @Operation(operationId = "requestPasswordReset", summary = "Mail a link to /reset-password",
            description = "Always 202, whether an account has the address or not. Only a verified address gets the link, "
                    + "valid for 1 hour.")
    @ApiResponse(responseCode = "202", description = "Accepted")
    @ApiResponse(responseCode = "429", description = "Too many requests from this client or for this address (code "
            + "too_many_requests)", content = @Content(mediaType = "application/problem+json",
            schema = @Schema(implementation = ProblemDetail.class)))
    public void requestPasswordReset(@Valid @RequestBody PasswordResetRequest body, HttpServletRequest request) {
        passwordReset.request(body.email(), ClientKey.of(request));
    }

    @PostMapping("/password-reset/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @SecurityRequirements
    @Operation(operationId = "confirmPasswordReset", summary = "Set a new password with the token of the mailed link",
            description = "Ends all sessions of the account except the caller's; the caller is not signed in by it. "
                    + "Cancels a pending e-mail change; the address is told.")
    @ApiResponse(responseCode = "204", description = "Password changed")
    @ApiResponse(responseCode = "410", description = "token_invalid or token_expired", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "429", description = "The server is busy hashing passwords (code too_many_requests); see "
            + "Retry-After", content = @Content(mediaType = "application/problem+json",
            schema = @Schema(implementation = ProblemDetail.class)))
    public void confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest body, HttpServletRequest request) {
        UUID account = passwordReset.confirm(body.token(), body.newPassword());
        sessions.endOthers(account, request);
    }
}
