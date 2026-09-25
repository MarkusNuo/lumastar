package app.lingora.domain;

import java.util.Objects;

/** How often an error category was logged within a period (PRD F6, F10 top errors). */
public record ErrorCategoryCount(ErrorCategory category, int count) {

    public ErrorCategoryCount {
        Objects.requireNonNull(category, "category");
        Require.that(count > 0, "count must be positive");
    }
}
