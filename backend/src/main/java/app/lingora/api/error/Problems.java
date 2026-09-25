package app.lingora.api.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

/**
 * RFC 9457 problem details of the Lingora API. Besides the standard fields every problem carries a stable,
 * machine-readable {@code code} that the frontend maps to German UI copy.
 */
public final class Problems {

    public static final String CODE = "code";
    public static final String UPLOAD_TOO_LARGE = "upload_too_large";

    private Problems() {
    }

    public static ProblemDetail of(HttpStatus status, String code, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setProperty(CODE, code);
        return problem;
    }
}
