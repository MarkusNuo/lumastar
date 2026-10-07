package app.lingora.api.auth;

import app.lingora.api.error.Problems;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.ErrorResponseException;

/** 429 with the {@code Retry-After} header and the same wait in {@code retryAfterSeconds}. */
class ThrottledException extends ErrorResponseException {

    private ThrottledException(String code, String detail, Duration retryAfter) {
        super(HttpStatus.TOO_MANY_REQUESTS, Problems.of(HttpStatus.TOO_MANY_REQUESTS, code, detail), null);
        long seconds = Math.max(1, retryAfter.plusMillis(999).toSeconds());
        getBody().setProperty("retryAfterSeconds", seconds);
        getHeaders().set(HttpHeaders.RETRY_AFTER, Long.toString(seconds));
    }

    static ThrottledException login(Duration retryAfter) {
        return new ThrottledException("login_throttled", "Too many failed sign-in attempts; try again later.", retryAfter);
    }

    static ThrottledException requests(Duration retryAfter) {
        return new ThrottledException("too_many_requests", "Too many requests of this kind; try again later.", retryAfter);
    }
}
