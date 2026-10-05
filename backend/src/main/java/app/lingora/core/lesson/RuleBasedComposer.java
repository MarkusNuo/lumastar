package app.lingora.core.lesson;

import app.lingora.domain.Exercise;
import app.lingora.domain.Level;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SrsCard;
import app.lingora.domain.Stage;
import app.lingora.domain.Unit;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;
import java.util.random.RandomGenerator;

/**
 * Phase 1 composer (PRD F7). A unit lesson of {@value #LESSON_SIZE} exercises mixes
 * <ul>
 *   <li>up to {@value #REVIEWS} due reviews (~15 %): exercises of the most overdue items, see {@link ReviewCover},</li>
 *   <li>up to {@value #WEAK_SPOTS} weak spots (~25 %): exercises of other units carrying the weakest tags
 *       ({@link WeakSpots}), one tag after the other,</li>
 *   <li>new content of the unit (~60 %), which also fills what the other parts leave free: exercises not practised
 *       yet first, then those within the {@link DifficultyWindow}, the easier ones first and across all types.</li>
 * </ul>
 * Weak spots and reviews come from exercises at or below the learner's level (the unit's level before the placement).
 * Every lesson is played by rising difficulty with alternating types. Focus lessons use the new-content rule on the
 * exercises of their tag, review lessons cover due items only, and a checkpoint takes {@value #CHECKPOINT_SIZE}
 * exercises from all units of the stage in turn, difficulty 2 and 3 first.
 */
public final class RuleBasedComposer implements LessonComposer {

    public static final int LESSON_SIZE = 12;
    public static final int REVIEWS = 2;
    public static final int WEAK_SPOTS = 3;
    public static final int CHECKPOINT_SIZE = 15;
    /** The weakest tags a lesson looks at for its weak spots. */
    static final int WEAK_TAGS = 5;

    private final RandomGenerator random;
    private final ExerciseBank bank;

    public RuleBasedComposer(RandomGenerator random, ExerciseBank bank) {
        this.random = random;
        this.bank = bank;
    }

    @Override
    public List<Exercise> compose(Unit unit, LessonContext context) {
        Level maxLevel = context.maxLevel(unit.level());
        Set<String> unitExercises = ids(unit.exercises());
        List<Exercise> picked = new ArrayList<>(reviews(context, maxLevel, REVIEWS));
        picked.addAll(weakSpots(context, maxLevel, excluding(picked).and(exercise -> !unitExercises.contains(exercise.id()))));
        picked.addAll(newContent(unit.exercises(), context, LESSON_SIZE - picked.size(), excluding(picked)));
        return LessonOrder.byRisingDifficulty(picked);
    }

    @Override
    public List<Exercise> composeFocus(Unit focusUnit, LessonContext context) {
        return LessonOrder.byRisingDifficulty(newContent(focusUnit.exercises(), context, LESSON_SIZE, exercise -> true));
    }

    @Override
    public List<Exercise> composeReview(LessonContext context) {
        return LessonOrder.byRisingDifficulty(reviews(context, context.maxLevel(Level.highest()), LESSON_SIZE));
    }

    @Override
    public List<Exercise> composeCheckpoint(Stage stage, LessonContext context) {
        List<Deque<Exercise>> units = new ArrayList<>();
        for (Unit unit : stage.units()) {
            List<Exercise> pool = shuffled(unit.exercises());
            pool.sort(Comparator.comparing((Exercise exercise) -> exercise.difficulty() == Exercise.MIN_DIFFICULTY));
            if (!pool.isEmpty()) {
                units.add(new ArrayDeque<>(pool));
            }
        }
        List<Exercise> picked = new ArrayList<>();
        while (picked.size() < CHECKPOINT_SIZE && !units.isEmpty()) {
            var turn = units.iterator();
            while (turn.hasNext() && picked.size() < CHECKPOINT_SIZE) {
                Deque<Exercise> unit = turn.next();
                picked.add(unit.removeFirst());
                if (unit.isEmpty()) {
                    turn.remove();
                }
            }
        }
        return LessonOrder.byRisingDifficulty(picked);
    }

    @Override
    public int checkpointLength(int stageExercises) {
        return Math.min(CHECKPOINT_SIZE, stageExercises);
    }

    private List<Exercise> reviews(LessonContext context, Level maxLevel, int count) {
        List<String> dueItems = context.dueCards().stream().map(SrsCard::itemId).toList();
        if (dueItems.isEmpty()) {
            return List.of();
        }
        return ReviewCover.of(dueItems, shuffled(bank.withItems(dueItems, maxLevel)), count);
    }

    /** One exercise per weak tag in turn, from the tags' exercises the filter lets through. */
    private List<Exercise> weakSpots(LessonContext context, Level maxLevel, Predicate<Exercise> allowed) {
        List<Deque<Exercise>> pools = new ArrayList<>();
        for (SkillTag tag : WeakSpots.rank(context, WEAK_TAGS)) {
            List<Exercise> pool = shuffled(bank.withSkillTag(tag, maxLevel)).stream().filter(allowed).toList();
            if (!pool.isEmpty()) {
                pools.add(new ArrayDeque<>(pool));
            }
        }
        List<Exercise> picked = new ArrayList<>();
        Set<String> taken = new HashSet<>();
        while (picked.size() < WEAK_SPOTS && pools.stream().anyMatch(pool -> !pool.isEmpty())) {
            for (Deque<Exercise> pool : pools) {
                pool.removeIf(exercise -> taken.contains(exercise.id()));
                if (!pool.isEmpty() && picked.size() < WEAK_SPOTS) {
                    Exercise exercise = pool.removeFirst();
                    picked.add(exercise);
                    taken.add(exercise.id());
                }
            }
        }
        return picked;
    }

    /**
     * Up to {@code count} of the candidates: not practised and within the difficulty window first, then practised within
     * the window, then the rest in the same order; easier ones first within each group and across all types.
     */
    private List<Exercise> newContent(List<Exercise> exercises, LessonContext context, int count, Predicate<Exercise> allowed) {
        DifficultyWindow window = DifficultyWindow.after(context.recentUnitAccuracies());
        List<Exercise> candidates = shuffled(exercises).stream()
                .filter(allowed)
                .sorted(Comparator.comparingInt(Exercise::difficulty))
                .toList();
        Predicate<Exercise> fresh = exercise -> !context.practisedExerciseIds().contains(exercise.id());
        List<Exercise> picked = new ArrayList<>();
        for (Predicate<Exercise> group : List.of(fresh.and(window::contains), fresh.negate().and(window::contains),
                fresh.and(exercise -> !window.contains(exercise)), fresh.negate().and(exercise -> !window.contains(exercise)))) {
            picked.addAll(LessonOrder.acrossTypes(candidates.stream().filter(group).toList(), count - picked.size()));
        }
        return picked;
    }

    private List<Exercise> shuffled(Collection<Exercise> exercises) {
        List<Exercise> copy = new ArrayList<>(exercises);
        Collections.shuffle(copy, random);
        return copy;
    }

    private static Predicate<Exercise> excluding(List<Exercise> picked) {
        Set<String> pickedIds = ids(picked);
        return exercise -> !pickedIds.contains(exercise.id());
    }

    private static Set<String> ids(List<Exercise> exercises) {
        Set<String> ids = new HashSet<>();
        exercises.forEach(exercise -> ids.add(exercise.id()));
        return ids;
    }
}
