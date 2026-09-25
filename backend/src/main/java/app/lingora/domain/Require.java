package app.lingora.domain;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;

/** Invariant checks for domain records; a violation is an {@link IllegalArgumentException} with a readable message. */
final class Require {

    private Require() {
    }

    static void that(boolean condition, String messageFormat, Object... args) {
        if (!condition) {
            throw new IllegalArgumentException(messageFormat.formatted(args));
        }
    }

    static void notBlank(String value, String name) {
        that(value != null && !value.isBlank(), "%s must not be blank", name);
    }

    static void notEmpty(Collection<?> values, String name) {
        that(!values.isEmpty(), "%s must not be empty", name);
    }

    static void distinct(Collection<?> values, String name) {
        that(new HashSet<>(values).size() == values.size(), "%s must not contain duplicates", name);
    }

    static void allNotBlank(Collection<String> values, String name) {
        that(values.stream().noneMatch(String::isBlank), "%s must not contain blank entries", name);
    }

    /** Immutable copy that treats a missing list as empty. */
    static <T> List<T> listOrEmpty(List<T> values) {
        return values == null ? List.of() : List.copyOf(values);
    }
}
