package app.lumastar.core.placement;

import app.lumastar.domain.Competence;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.Level;
import app.lumastar.domain.PlacementResult;
import app.lumastar.domain.PlacementState;
import app.lumastar.domain.PlacementState.Step;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.random.RandomGenerator;
import java.util.stream.Collectors;

/**
 * Rule-based placement test: the {@link Staircase} over the 19 stages with at most {@value #MAX_ITEMS} items.
 * <p>
 * Item selection: an unused item of the current stage whose competence follows the competence of the previous item
 * in the rotation vocabulary → grammar → translation → reading, skipping competences without an unused item there.
 * If the current stage is used up, the nearest stage with unused items is taken, the lower one on a tie. The injected
 * random generator picks among equal candidates. The test also ends when the whole bank is used up.
 */
public final class RuleBasedPlacementEngine implements PlacementEngine {

    public static final int MAX_ITEMS = 20;
    static final List<Competence> ROTATION =
            List.of(Competence.VOCABULARY, Competence.GRAMMAR, Competence.TRANSLATION, Competence.READING);
    private static final Level[] LEVELS = Level.values();

    private final Map<Level, List<Exercise>> itemsByLevel;
    private final RandomGenerator random;

    public RuleBasedPlacementEngine(List<Exercise> itemBank, RandomGenerator random) {
        itemBank.forEach(item -> Objects.requireNonNull(item.competence(), "competence of placement item " + item.id()));
        this.itemsByLevel = itemBank.stream()
                .sorted(Comparator.comparing(Exercise::id))
                .collect(Collectors.groupingBy(Exercise::level, () -> new EnumMap<>(Level.class), Collectors.toList()));
        this.random = random;
    }

    @Override
    public Exercise nextItem(PlacementState state) {
        requireNotFinished(state);
        Set<String> used = usedItems(state);
        Level stage = nearestStageWithUnusedItems(Staircase.replay(state).current(), used).orElseThrow();
        List<Exercise> unused = unusedItems(stage, used);
        Competence competence = nextCompetence(state, unused);
        List<Exercise> candidates = unused.stream().filter(item -> item.competence() == competence).toList();
        return candidates.get(random.nextInt(candidates.size()));
    }

    @Override
    public PlacementState record(PlacementState state, Step step) {
        requireNotFinished(state);
        List<Step> steps = new ArrayList<>(state.steps());
        steps.add(step);
        Level current = Staircase.replay(new PlacementState(state.startLevel(), state.currentLevel(), steps)).current();
        return new PlacementState(state.startLevel(), current, steps);
    }

    @Override
    public boolean isFinished(PlacementState state) {
        return state.steps().size() >= MAX_ITEMS
                || Staircase.replay(state).hasEnded()
                || nearestStageWithUnusedItems(state.startLevel(), usedItems(state)).isEmpty();
    }

    @Override
    public int maxItems() {
        return MAX_ITEMS;
    }

    @Override
    public PlacementResult evaluate(PlacementState state) {
        return PlacementEvaluation.evaluate(Staircase.replay(state).placement(), state.steps());
    }

    private void requireNotFinished(PlacementState state) {
        if (isFinished(state)) {
            throw new IllegalStateException("The placement test is finished");
        }
    }

    private Optional<Level> nearestStageWithUnusedItems(Level from, Set<String> used) {
        for (int distance = 0; distance < LEVELS.length; distance++) {
            for (int index : new int[] {from.ordinal() - distance, from.ordinal() + distance}) {
                if (index >= 0 && index < LEVELS.length && !unusedItems(LEVELS[index], used).isEmpty()) {
                    return Optional.of(LEVELS[index]);
                }
            }
        }
        return Optional.empty();
    }

    private List<Exercise> unusedItems(Level stage, Set<String> used) {
        return itemsByLevel.getOrDefault(stage, List.of()).stream().filter(item -> !used.contains(item.id())).toList();
    }

    private static Competence nextCompetence(PlacementState state, List<Exercise> unused) {
        int start = state.steps().isEmpty() ? 0 : ROTATION.indexOf(state.steps().getLast().competence()) + 1;
        for (int offset = 0; offset < ROTATION.size(); offset++) {
            Competence competence = ROTATION.get((start + offset) % ROTATION.size());
            if (unused.stream().anyMatch(item -> item.competence() == competence)) {
                return competence;
            }
        }
        throw new IllegalStateException("Every unused placement item has a competence of the rotation");
    }

    private static Set<String> usedItems(PlacementState state) {
        return state.steps().stream().map(Step::exerciseId).collect(Collectors.toSet());
    }
}
