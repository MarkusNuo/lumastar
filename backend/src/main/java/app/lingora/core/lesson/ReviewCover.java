package app.lingora.core.lesson;

import app.lingora.domain.Exercise;
import app.lingora.domain.ExerciseType;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Exercises that practise due items (PRD F8): the most overdue item not covered yet gets the exercise that covers the
 * most due items still uncovered, preferring types the lesson has shown least, until the count is reached.
 */
final class ReviewCover {

    private ReviewCover() {
    }

    /**
     * @param dueItemIds most overdue first
     * @param candidates in the order to prefer among equals
     */
    static List<Exercise> of(List<String> dueItemIds, List<Exercise> candidates, int count) {
        Set<String> uncovered = new HashSet<>(dueItemIds);
        List<Exercise> remaining = new ArrayList<>(candidates);
        Map<ExerciseType, Integer> typesShown = new HashMap<>();
        List<Exercise> picked = new ArrayList<>();
        for (String itemId : dueItemIds) {
            if (picked.size() == count) {
                break;
            }
            if (!uncovered.contains(itemId)) {
                continue;
            }
            remaining.stream()
                    .filter(exercise -> exercise.itemIds().contains(itemId))
                    .max(Comparator.comparingLong((Exercise exercise) -> exercise.itemIds().stream().filter(uncovered::contains).count())
                            .thenComparing(exercise -> -typesShown.getOrDefault(exercise.type(), 0)))
                    .ifPresent(exercise -> {
                        picked.add(exercise);
                        remaining.remove(exercise);
                        exercise.itemIds().forEach(uncovered::remove);
                        typesShown.merge(exercise.type(), 1, Integer::sum);
                    });
        }
        return picked;
    }
}
