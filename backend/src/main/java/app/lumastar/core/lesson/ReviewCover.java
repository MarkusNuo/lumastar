package app.lumastar.core.lesson;

import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExerciseType;
import app.lumastar.domain.Level;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Exercises that practise due items (PRD F8): the most overdue item not covered yet gets the exercise that covers the
 * most due items still uncovered, preferring types the lesson has shown least, until the count is reached. An item is
 * practised by exercises up to its {@link MetContent} level, so every due item with an exercise can be covered.
 */
final class ReviewCover {

    private ReviewCover() {
    }

    /**
     * @param dueItemIds most overdue first
     * @param candidates the exercises of every level that practise due items, in the order to prefer among equals
     */
    static List<Exercise> of(List<String> dueItemIds, List<Exercise> candidates, Level learnerLevel, int count) {
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
            Optional<Level> maxLevel = MetContent.maxLevel(learnerLevel, candidates.stream()
                    .filter(exercise -> exercise.itemIds().contains(itemId))
                    .map(Exercise::level)
                    .toList());
            if (maxLevel.isEmpty()) {
                continue;
            }
            remaining.stream()
                    .filter(exercise -> exercise.itemIds().contains(itemId) && !exercise.level().isAbove(maxLevel.get()))
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
