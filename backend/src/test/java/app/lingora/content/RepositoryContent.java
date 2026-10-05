package app.lingora.content;

import app.lingora.core.evaluation.StandardFormLexicon;
import app.lingora.domain.Exercise;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

/** The repository's {@code /content}, read once per test run by the tests that check the real content. */
public final class RepositoryContent {

    /** Tests run in {@code /backend}. */
    public static final Path DIRECTORY = Path.of("../content");

    private RepositoryContent() {
    }

    public static ContentBundle bundle() {
        return Loaded.BUNDLE;
    }

    /** The Standard-form lexicon of {@code content/gheg_blocklist.json}. */
    public static StandardFormLexicon lexicon() {
        return Loaded.LEXICON;
    }

    /** The lesson exercises of all units in path order, then the placement items. */
    public static List<Exercise> allExercises() {
        return Stream.concat(bundle().curriculum().units().stream().flatMap(unit -> unit.exercises().stream()),
                bundle().placementExercises().stream()).toList();
    }

    private static final class Loaded {

        static final ContentBundle BUNDLE = load();
        static final StandardFormLexicon LEXICON = GhegBlocklistReader.read(DIRECTORY.resolve(GhegBlocklistReader.FILE));

        private static ContentBundle load() {
            try (ValidatorFactory validation = Validation.buildDefaultValidatorFactory()) {
                return new ContentLoader(validation.getValidator()).load(DIRECTORY);
            }
        }
    }
}
