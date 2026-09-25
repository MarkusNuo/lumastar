package app.lingora.domain;

import java.util.Arrays;
import java.util.stream.Collectors;

/** A closed set of values with a stable external code, as used in content files, the API and the database. */
public interface Coded {

    String code();

    static <E extends Enum<E> & Coded> E fromCode(Class<E> type, String code) {
        for (E constant : type.getEnumConstants()) {
            if (constant.code().equals(code)) {
                return constant;
            }
        }
        String allowed = Arrays.stream(type.getEnumConstants()).map(Coded::code).collect(Collectors.joining(", "));
        throw new IllegalArgumentException(
                "Unknown %s '%s'; expected one of: %s".formatted(type.getSimpleName(), code, allowed));
    }
}
