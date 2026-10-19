package app.lumastar.content;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

/** Collects all problems of an import run so that they can be reported together. */
final class ContentProblems {

    private final List<String> problems = new ArrayList<>();

    void add(String location, String message) {
        problems.add(location + ": " + message);
    }

    /** Runs a domain factory and records its {@link IllegalArgumentException} as a problem at {@code location}. */
    <T> Optional<T> attempt(String location, Supplier<T> factory) {
        try {
            return Optional.of(factory.get());
        } catch (IllegalArgumentException e) {
            add(location, e.getMessage());
            return Optional.empty();
        }
    }

    void throwIfAny(Path contentRoot) {
        if (!problems.isEmpty()) {
            throw new ContentValidationException(contentRoot, problems);
        }
    }
}
