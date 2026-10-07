package app.lingora.api.auth;

import app.lingora.api.error.ApiProblemException;
import org.springframework.http.HttpStatus;

/** The expected errors of sign-in and account management with their stable problem codes. */
final class AccountProblems {

    private AccountProblems() {
    }

    static ApiProblemException invalidCredentials() {
        return new ApiProblemException(HttpStatus.UNAUTHORIZED, "invalid_credentials", "Wrong e-mail address or password.");
    }

    static ApiProblemException invalidPassword() {
        return new ApiProblemException(HttpStatus.FORBIDDEN, "invalid_password", "The current password is wrong.");
    }

    static ApiProblemException registrationClosed() {
        return new ApiProblemException(HttpStatus.FORBIDDEN, "registration_closed",
                "This instance does not accept new accounts.");
    }

    static ApiProblemException inviteCodeInvalid() {
        return new ApiProblemException(HttpStatus.FORBIDDEN, "invite_code_invalid",
                "Registration needs a valid invite code.");
    }

    static ApiProblemException emailTaken() {
        return new ApiProblemException(HttpStatus.CONFLICT, "email_taken", "Another account uses this e-mail address.");
    }

    static ApiProblemException emailAlreadyVerified() {
        return new ApiProblemException(HttpStatus.CONFLICT, "email_already_verified",
                "The e-mail address is verified and no change is pending.");
    }

    static ApiProblemException emailRequired() {
        return new ApiProblemException(HttpStatus.CONFLICT, "email_required",
                "The account has no e-mail address yet; add one first.");
    }

    static ApiProblemException tokenInvalid() {
        return new ApiProblemException(HttpStatus.GONE, "token_invalid", "The link is invalid or has been used already.");
    }

    static ApiProblemException tokenExpired() {
        return new ApiProblemException(HttpStatus.GONE, "token_expired", "The link has expired; request a new one.");
    }
}
