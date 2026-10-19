package app.lumastar.content;

import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;

/** The content files break the format contract; every problem names its file and location. */
public class ContentValidationException extends RuntimeException {

    private final List<String> problems;

    public ContentValidationException(Path contentRoot, List<String> problems) {
        super(describe(contentRoot, problems));
        this.problems = List.copyOf(problems);
    }

    public List<String> problems() {
        return problems;
    }

    private static String describe(Path contentRoot, List<String> problems) {
        return problems.stream().collect(Collectors.joining(System.lineSeparator() + "  - ",
                "Content in %s is invalid (%d problems):%n  - ".formatted(contentRoot, problems.size()), ""));
    }
}
