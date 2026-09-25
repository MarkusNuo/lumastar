package app.lingora.api.error;

import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/** An expected API error, rendered as a problem with a stable {@code code}. */
public class ApiProblemException extends ErrorResponseException {

    public ApiProblemException(HttpStatus status, String code, String detail) {
        super(status, Problems.of(status, code, detail), null);
    }
}
