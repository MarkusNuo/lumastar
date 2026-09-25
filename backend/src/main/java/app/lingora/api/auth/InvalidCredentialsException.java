package app.lingora.api.auth;

import app.lingora.api.error.Problems;
import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class InvalidCredentialsException extends ErrorResponseException {

    InvalidCredentialsException() {
        super(HttpStatus.UNAUTHORIZED, Problems.of(HttpStatus.UNAUTHORIZED, "invalid_credentials", "Wrong password."), null);
    }
}
