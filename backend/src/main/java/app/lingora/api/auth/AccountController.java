package app.lingora.api.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
@Tag(name = "account", description = "Sign-in address, password, display name and deletion of the signed-in account")
public class AccountController {

    private final AccountService accounts;
    private final AccountManagement management;
    private final EmailVerification emailVerification;
    private final SessionSignIn sessionSignIn;
    private final UserSessions sessions;

    AccountController(AccountService accounts, AccountManagement management, EmailVerification emailVerification,
                      SessionSignIn sessionSignIn, UserSessions sessions) {
        this.accounts = accounts;
        this.management = management;
        this.emailVerification = emailVerification;
        this.sessionSignIn = sessionSignIn;
        this.sessions = sessions;
    }

    @GetMapping
    @Operation(operationId = "getAccount", summary = "The signed-in account")
    @ApiResponse(responseCode = "200", description = "The account")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public AccountResponse getAccount(@AuthenticationPrincipal AuthenticatedUser principal) {
        return AccountResponse.of(accounts.current(principal));
    }

    @PutMapping("/display-name")
    @Operation(operationId = "changeDisplayName", summary = "Change the name shown in the app")
    @ApiResponse(responseCode = "200", description = "The changed account")
    @ApiResponse(responseCode = "400", description = "Invalid name (code validation_failed)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public AccountResponse changeDisplayName(@AuthenticationPrincipal AuthenticatedUser principal,
                                             @Valid @RequestBody DisplayNameRequest body) {
        return AccountResponse.of(management.rename(principal.userId(), body.displayName()));
    }

    @PutMapping("/email")
    @Operation(operationId = "changeEmail", summary = "Change or add the sign-in address",
            description = "A verified address stays until the new one is confirmed by the link mailed to it "
                    + "(pendingEmail). An unverified or missing address, as of the account from before multi-user "
                    + "support, is replaced at once and gets a verification link. The current address cancels a "
                    + "pending change.")
    @ApiResponse(responseCode = "200", description = "The changed account")
    @ApiResponse(responseCode = "400", description = "Invalid address (code validation_failed)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "Wrong current password (code invalid_password)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Another account uses the address (code email_taken)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "429", description = "login_throttled after wrong passwords, too_many_requests after too "
            + "many account mails", content = @Content(mediaType = "application/problem+json",
            schema = @Schema(implementation = ProblemDetail.class)))
    public AccountResponse changeEmail(@AuthenticationPrincipal AuthenticatedUser principal,
                                       @Valid @RequestBody EmailChangeRequest body, HttpServletRequest request) {
        return AccountResponse.of(emailVerification.change(principal.userId(), body.newEmail(), body.password(),
                request.getRemoteAddr()));
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "changePassword", summary = "Change the password",
            description = "Ends all other sessions of the account; this one stays signed in.")
    @ApiResponse(responseCode = "204", description = "Password changed")
    @ApiResponse(responseCode = "400", description = "New password too short or too long (code validation_failed)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "Wrong current password (code invalid_password)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "429", description = "Too many wrong passwords (code login_throttled)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public void changePassword(@AuthenticationPrincipal AuthenticatedUser principal,
                               @Valid @RequestBody PasswordChangeRequest body, HttpServletRequest request) {
        management.changePassword(principal.userId(), body.currentPassword(), body.newPassword(), request.getRemoteAddr());
        sessions.endOthers(principal.userId(), request);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "deleteAccount", summary = "Delete the account and all its learning data",
            description = "Irreversible; the app offers the export (GET /api/profile/export) first. Ends all sessions "
                    + "of the account, including this one.")
    @ApiResponse(responseCode = "204", description = "Account deleted and signed out")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "Wrong password (code invalid_password)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "429", description = "Too many wrong passwords (code login_throttled)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public void deleteAccount(@AuthenticationPrincipal AuthenticatedUser principal,
                              @Valid @RequestBody AccountDeletionRequest body, Authentication authentication,
                              HttpServletRequest request, HttpServletResponse response) {
        management.delete(principal.userId(), body.password(), request.getRemoteAddr());
        sessions.endOthers(principal.userId(), request);
        sessionSignIn.signOut(authentication, request, response);
    }
}
