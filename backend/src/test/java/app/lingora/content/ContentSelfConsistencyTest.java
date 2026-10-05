package app.lingora.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.core.evaluation.RuleBasedAnswerEvaluator;
import app.lingora.domain.Exercise;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * Every exercise of the repository's {@code /content} (lessons and placement) is consistent with the evaluator and the
 * real Gheg blocklist, see {@link ExerciseSelfCheck}. Content is maintained in /content: a broken exercise goes to
 * {@link #KNOWN_ISSUES} until it is fixed there, and leaves it as soon as it passes.
 */
class ContentSelfConsistencyTest {

    /** Exercise id → what is wrong with it; reported to the content author. This list may only shrink. */
    private static final Map<String, String> KNOWN_ISSUES = Map.of();

    private static final ExerciseSelfCheck CHECK = new ExerciseSelfCheck(new RuleBasedAnswerEvaluator(RepositoryContent.lexicon()));

    static Stream<Arguments> exercises() {
        return RepositoryContent.allExercises().stream().map(exercise -> Arguments.of(exercise.id(), exercise));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("exercises")
    void acceptsExactlyWhatTheExerciseDeclaresAsRight(String id, Exercise exercise) {
        List<String> violations = CHECK.violations(exercise);

        if (KNOWN_ISSUES.containsKey(id)) {
            assertThat(violations).as("%s is listed in KNOWN_ISSUES (%s) but is consistent now: remove it from the list",
                    id, KNOWN_ISSUES.get(id)).isNotEmpty();
        } else {
            assertThat(violations).as("content issues of %s", id).isEmpty();
        }
    }

    @Test
    void knownIssuesNameExercisesOfTheContent() {
        assertThat(RepositoryContent.allExercises()).extracting(Exercise::id).containsAll(KNOWN_ISSUES.keySet());
    }
}
