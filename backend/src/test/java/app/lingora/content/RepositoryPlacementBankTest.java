package app.lingora.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.core.placement.RuleBasedPlacementEngine;
import app.lingora.domain.Competence;
import app.lingora.domain.Exercise;
import app.lingora.domain.Level;
import app.lingora.domain.Outcome;
import app.lingora.domain.PlacementState;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.function.Predicate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** The placement engine on the repository's item bank: the PRD F2 criteria hold for the real content, too. */
class RepositoryPlacementBankTest extends IntegrationTest {

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentProperties properties;

    private RuleBasedPlacementEngine engine;

    @BeforeEach
    void engineOnTheRepositoryBank() {
        engine = new RuleBasedPlacementEngine(loader.load(properties.directory()).placementExercises(), new Random(3));
    }

    private List<Exercise> run(Level start, Predicate<Level> knows, List<PlacementState> end) {
        PlacementState state = new PlacementState(start, start, List.of());
        List<Exercise> items = new ArrayList<>();
        while (!engine.isFinished(state)) {
            Exercise item = engine.nextItem(state);
            items.add(item);
            state = engine.record(state, new PlacementState.Step(item.id(), item.level(), item.competence(), item.skillTags(),
                    knows.test(item.level()) ? Outcome.CORRECT : Outcome.WRONG));
        }
        end.add(state);
        return items;
    }

    @Test
    void aBeginnerIsPlacedOnA0WithinSixItems() {
        for (Level start : List.of(Level.A0, Level.A1_1)) {
            List<PlacementState> end = new ArrayList<>();

            assertThat(run(start, level -> false, end)).hasSizeLessThanOrEqualTo(6);
            assertThat(engine.evaluate(end.getFirst()).level()).isEqualTo(Level.A0);
        }
    }

    @Test
    void aLearnerOnB1_1IsPlacedThereAndTestedInAllFourCompetences() {
        List<PlacementState> end = new ArrayList<>();

        List<Exercise> items = run(Level.A2_2, level -> !level.isAbove(Level.B1_1), end);

        assertThat(items).hasSizeLessThanOrEqualTo(RuleBasedPlacementEngine.MAX_ITEMS);
        assertThat(items).extracting(Exercise::competence).contains(Competence.values());
        assertThat(engine.evaluate(end.getFirst()).level()).isEqualTo(Level.B1_1);
    }
}
