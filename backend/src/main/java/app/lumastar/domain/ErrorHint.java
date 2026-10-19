package app.lumastar.domain;

import java.util.Objects;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/**
 * Maps a typical wrong answer to an error category. The pattern is matched case-insensitively against the
 * normalised wrong answer; {@code hint} is an optional German hint.
 */
public record ErrorHint(String pattern, ErrorCategory category, String hint) {

    private static final int MATCH_FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS;

    public ErrorHint {
        Require.notBlank(pattern, "error hint pattern");
        Objects.requireNonNull(category, "error hint category");
        try {
            Pattern.compile(pattern, MATCH_FLAGS);
        } catch (PatternSyntaxException e) {
            throw new IllegalArgumentException("error hint pattern '%s' is not a valid regex: %s"
                    .formatted(pattern, e.getDescription()), e);
        }
    }

    /** Whether the pattern occurs in the answer, normalised per docs/CONTENT_FORMAT.md points 1–3 (diacritics kept). */
    public boolean matches(String normalizedAnswer) {
        return Pattern.compile(pattern, MATCH_FLAGS).matcher(normalizedAnswer).find();
    }
}
