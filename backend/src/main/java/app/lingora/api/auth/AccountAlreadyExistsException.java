package app.lingora.api.auth;

import app.lingora.api.error.Problems;
import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class AccountAlreadyExistsException extends ErrorResponseException {

    AccountAlreadyExistsException() {
        super(HttpStatus.CONFLICT, Problems.of(HttpStatus.CONFLICT, "account_exists",
                "This instance already has an account; sign in instead."), null);
    }
}
