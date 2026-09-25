package app.lingora.api.auth;

import app.lingora.api.error.Problems;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

class LoginThrottledException extends ErrorResponseException {

    LoginThrottledException(Duration retryAfter) {
        super(HttpStatus.TOO_MANY_REQUESTS, Problems.of(HttpStatus.TOO_MANY_REQUESTS, "login_throttled",
                "Too many failed sign-in attempts; try again later."), null);
        long seconds = Math.max(1, retryAfter.plusMillis(999).toSeconds());
        getBody().setProperty("retryAfterSeconds", seconds);
        getHeaders().set(HttpHeaders.RETRY_AFTER, Long.toString(seconds));
    }
}
