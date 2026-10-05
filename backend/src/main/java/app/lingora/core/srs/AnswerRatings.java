package app.lingora.core.srs;

import app.lingora.domain.Answer;
import app.lingora.domain.AnswerNormalizer;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload.MatchPairs;
import app.lingora.domain.Item;
import app.lingora.domain.MatchPair;
import app.lingora.domain.Outcome;
import app.lingora.domain.Rating;
import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

/**
 * The FSRS ratings of one first answer (PRD F8): the rating of the answer as a whole and the rating of every item of
 * the exercise, both by {@link RatingPolicy}. An item counts as known in its own review state; the answer counts as
 * one on known items when all its items are known.
 * <p>
 * Match pairs with wrong matches are rated per pair instead: the items of the confused pairs are rated again, the
 * others good. A pair belongs to the items whose Gheg form (or its definite, plural or alternative form) it contains as
 * words, or else, if the exercise lists one item per pair, to the item at its position. If a confused pair belongs to
 * no item, every item is rated again.
 *
 * @param answer the rating stored with the answer
 * @param items  the rating per item id, in the order of the exercise's items
 */
public record AnswerRatings(Rating answer, Map<String, Rating> items) {

    public AnswerRatings {
        Objects.requireNonNull(answer, "answer");
        items = Collections.unmodifiableMap(new LinkedHashMap<>(items));
    }

    /**
     * @param typicalTime  the typical response time of the exercise type, see {@link RatingPolicy#typicalTime}
     * @param knownItemIds the items whose card is in the review state before this answer
     * @param items        the items of the exercise; only needed for match pairs
     */
    public static AnswerRatings of(Exercise exercise, Answer answer, Outcome outcome, Optional<Duration> typicalTime,
                                   Set<String> knownItemIds, Map<String, Item> items) {
        boolean allKnown = !exercise.itemIds().isEmpty() && knownItemIds.containsAll(exercise.itemIds());
        Rating answerRating = RatingPolicy.rate(outcome, answer.responseTime(), typicalTime, allKnown);
        Map<String, Rating> itemRatings = new LinkedHashMap<>();
        Optional<Set<String>> confused = confusedItems(exercise, answer, items);
        for (String itemId : exercise.itemIds()) {
            Rating rating = confused
                    .map(confusedIds -> confusedIds.contains(itemId) ? Rating.AGAIN : Rating.GOOD)
                    .orElseGet(() -> RatingPolicy.rate(outcome, answer.responseTime(), typicalTime, knownItemIds.contains(itemId)));
            itemRatings.put(itemId, rating);
        }
        return new AnswerRatings(answerRating, itemRatings);
    }

    /** The items of the confused pairs; empty unless the answer is a match pairs answer with wrong matches. */
    private static Optional<Set<String>> confusedItems(Exercise exercise, Answer answer, Map<String, Item> items) {
        if (!(exercise.payload() instanceof MatchPairs pairs) || !(answer instanceof Answer.WrongMatches wrong)
                || wrong.matches().isEmpty()) {
            return Optional.empty();
        }
        Set<String> confused = new LinkedHashSet<>();
        for (int index = 0; index < pairs.pairs().size(); index++) {
            MatchPair pair = pairs.pairs().get(index);
            if (wrong.matches().stream().anyMatch(match -> same(pair.left(), match.left()) || same(pair.right(), match.right()))) {
                Set<String> ofPair = itemsOf(pair, index, exercise.itemIds(), pairs.pairs().size(), items);
                if (ofPair.isEmpty()) {
                    return Optional.of(Set.copyOf(exercise.itemIds()));
                }
                confused.addAll(ofPair);
            }
        }
        return Optional.of(confused);
    }

    private static Set<String> itemsOf(MatchPair pair, int index, List<String> itemIds, int pairCount, Map<String, Item> items) {
        String words = " " + AnswerNormalizer.normalize(pair.left()) + " ";
        Set<String> matching = new LinkedHashSet<>();
        for (String itemId : itemIds) {
            Item item = items.get(itemId);
            if (item != null && forms(item).anyMatch(form -> words.contains(" " + form + " "))) {
                matching.add(itemId);
            }
        }
        if (matching.isEmpty() && itemIds.size() == pairCount) {
            matching.add(itemIds.get(index));
        }
        return matching;
    }

    private static Stream<String> forms(Item item) {
        return Stream.concat(Stream.of(item.gheg(), item.definite(), item.plural()), item.alternatives().stream())
                .filter(Objects::nonNull)
                .map(AnswerNormalizer::normalize)
                .filter(form -> !form.isEmpty());
    }

    private static boolean same(String side, String reported) {
        return AnswerNormalizer.normalize(side).equals(AnswerNormalizer.normalize(reported));
    }
}
