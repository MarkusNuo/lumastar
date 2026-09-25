package app.lingora.domain;

import java.util.Objects;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Maps a typical wrong answer to an error category. The pattern is matched case-insensitively against the
 * normalised wrong answer; {@code hint} is an optional German hint.
 */
public record ErrorHint(String pattern, ErrorCategory category, String hint) {

    public ErrorHint {
        Require.notBlank(pattern, "error hint pattern");
        Objects.requireNonNull(category, "error hint category");
        try {
            Pattern.compile(pattern);
        } catch (PatternSyntaxException e) {
            throw new IllegalArgumentException("error hint pattern '%s' is not a valid regex: %s"
                    .formatted(pattern, e.getDescription()), e);
        }
    }
}
