package app.lumastar.core.lesson;

import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExerciseType;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Selection across exercise types and the play order of a lesson: rising difficulty, types alternating. */
final class LessonOrder {

    private LessonOrder() {
    }

    /**
     * Takes up to {@code count} exercises, one of each type in turn, so that a lesson shows as many types as the
     * candidates offer; within a type the candidates keep their order.
     */
    static List<Exercise> acrossTypes(List<Exercise> candidates, int count) {
        Map<ExerciseType, Deque<Exercise>> byType = groupByType(candidates);
        List<Exercise> picked = new ArrayList<>();
        while (picked.size() < count && !byType.isEmpty()) {
            var types = byType.values().iterator();
            while (types.hasNext() && picked.size() < count) {
                Deque<Exercise> ofType = types.next();
                picked.add(ofType.removeFirst());
                if (ofType.isEmpty()) {
                    types.remove();
                }
            }
        }
        return picked;
    }

    static List<Exercise> byRisingDifficulty(List<Exercise> picked) {
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
