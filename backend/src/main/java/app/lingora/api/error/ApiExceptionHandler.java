package app.lingora.api.error;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Renders every error as {@code application/problem+json}, including the ones raised by the security filter
 * chain, which delegates to this handler.
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException exception) {
        return problem(Problems.of(HttpStatus.UNAUTHORIZED, "authentication_required", "Please sign in first."));
    }

    @ExceptionHandler(CsrfException.class)
    ResponseEntity<ProblemDetail> handleCsrf(CsrfException exception) {
        return problem(Problems.of(HttpStatus.FORBIDDEN, "csrf_invalid",
                "Missing or invalid CSRF token: send the XSRF-TOKEN cookie value in the X-XSRF-TOKEN header."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException exception) {
        return problem(Problems.of(HttpStatus.FORBIDDEN, "forbidden", "Access denied."));
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        ProblemDetail problem = Problems.of(HttpStatus.BAD_REQUEST, "validation_failed", "The request contains invalid fields.");
        List<Map<String, String>> errors = exception.getBindingResult().getFieldErrors().stream()
                .sorted(Comparator.comparing(FieldError::getField))
                .map(error -> Map.of("field", error.getField(), "message", String.valueOf(error.getDefaultMessage())))
                .toList();
        problem.setProperty("errors", errors);
        return handleExceptionInternal(exception, problem, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException exception,
                                                                          HttpHeaders headers, HttpStatusCode status,
                                                                          WebRequest request) {
        ProblemDetail problem = Problems.of(HttpStatus.CONTENT_TOO_LARGE, Problems.UPLOAD_TOO_LARGE,
                "The uploaded file is too large.");
        return handleExceptionInternal(exception, problem, headers, status, request);
    }

    /** Gives Spring MVC's standard errors (404, 405, 415, …) a {@code code} too, derived from the status. */
    @Override
    protected ResponseEntity<Object> createResponseEntity(Object body, HttpHeaders headers, HttpStatusCode status,
                                                          WebRequest request) {
        if (body instanceof ProblemDetail problem && (problem.getProperties() == null
                || !problem.getProperties().containsKey(Problems.CODE))) {
            HttpStatus resolved = HttpStatus.resolve(status.value());
            problem.setProperty(Problems.CODE, resolved == null ? "error" : resolved.name().toLowerCase(Locale.ROOT));
        }
        return super.createResponseEntity(body, headers, status, request);
    }

    private static ResponseEntity<ProblemDetail> problem(ProblemDetail problem) {
        return ResponseEntity.status(problem.getStatus()).body(problem);
    }
}
