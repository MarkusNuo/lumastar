package app.lingora.core.lesson;

import app.lingora.domain.ErrorEntry;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SrsCard;
import app.lingora.domain.Unit;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.random.RandomGenerator;

/**
 * Phase 1 composer: up to {@value #LESSON_SIZE} exercises of the unit, picked across all exercise types after a
 * shuffle and ordered by rising difficulty, avoiding the same type twice in a row where possible. Profile, mastery,
 * due reviews and errors are not used yet; the 60/25/15 mix of PRD F7 follows with the adaptivity milestone.
 */
public final class RuleBasedLessonComposer implements LessonComposer {

    public static final int LESSON_SIZE = 12;

    private final RandomGenerator random;

    public RuleBasedLessonComposer(RandomGenerator random) {
        this.random = random;
    }

    @Override
    public List<Exercise> compose(Unit unit, LearnerProfile profile, SkillMastery mastery, List<SrsCard> due,
                                  List<ErrorEntry> errors) {
        List<Exercise> shuffled = new ArrayList<>(unit.exercises());
        Collections.shuffle(shuffled, random);
        return byRisingDifficulty(pickAcrossTypes(shuffled));
    }

    /** Takes one exercise of each type in turn, so that a lesson shows as many types as the unit offers. */
    private static List<Exercise> pickAcrossTypes(List<Exercise> shuffled) {
        Map<ExerciseType, Deque<Exercise>> byType = groupByType(shuffled);
        List<Exercise> picked = new ArrayList<>();
        while (picked.size() < LESSON_SIZE && !byType.isEmpty()) {
            var types = byType.values().iterator();
            while (types.hasNext() && picked.size() < LESSON_SIZE) {
                Deque<Exercise> ofType = types.next();
                picked.add(ofType.removeFirst());
                if (ofType.isEmpty()) {
                    types.remove();
                }
            }
        }
        return picked;
    }

    private static List<Exercise> byRisingDifficulty(List<Exercise> picked) {
        Map<Integer, List<Exercise>> byDifficulty = new TreeMap<>();
        picked.forEach(exercise -> byDifficulty.computeIfAbsent(exercise.difficulty(), key -> new ArrayList<>()).add(exercise));
        List<Exercise> ordered = new ArrayList<>();
        for (List<Exercise> sameDifficulty : byDifficulty.values()) {
            ExerciseType previousType = ordered.isEmpty() ? null : ordered.getLast().type();
            ordered.addAll(interleaveTypes(sameDifficulty, previousType));
        }
        return ordered;
    }

    /** Orders exercises of one difficulty so that types alternate, taking the type with most exercises left first. */
    private static List<Exercise> interleaveTypes(List<Exercise> exercises, ExerciseType previousType) {
        Map<ExerciseType, Deque<Exercise>> byType = groupByType(exercises);
        List<Exercise> ordered = new ArrayList<>();
        ExerciseType lastType = previousType;
        while (!byType.isEmpty()) {
            ExerciseType next = nextType(byType, lastType);
            Deque<Exercise> ofType = byType.get(next);
            ordered.add(ofType.removeFirst());
            if (ofType.isEmpty()) {
                byType.remove(next);
            }
            lastType = next;
        }
        return ordered;
    }

    private static ExerciseType nextType(Map<ExerciseType, Deque<Exercise>> byType, ExerciseType lastType) {
        return byType.entrySet().stream()
                .filter(entry -> entry.getKey() != lastType || byType.size() == 1)
                .max(Comparator.comparingInt(entry -> entry.getValue().size()))
                .map(Map.Entry::getKey)
                .orElseThrow();
    }

    private static Map<ExerciseType, Deque<Exercise>> groupByType(List<Exercise> exercises) {
        Map<ExerciseType, Deque<Exercise>> byType = new LinkedHashMap<>();
        exercises.forEach(exercise -> byType.computeIfAbsent(exercise.type(), key -> new ArrayDeque<>()).add(exercise));
        return byType;
    }
}
