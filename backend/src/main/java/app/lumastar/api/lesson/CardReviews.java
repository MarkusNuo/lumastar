package app.lumastar.api.lesson;

import app.lumastar.core.srs.AnswerRatings;
import app.lumastar.core.srs.RatingPolicy;
import app.lumastar.core.srs.SpacedRepetitionScheduler;
import app.lumastar.core.srs.SpacedRepetitionSchedulerFactory;
import app.lumastar.domain.Answer;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExerciseType;
import app.lumastar.domain.Item;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.Rating;
import app.lumastar.domain.SrsCard;
import app.lumastar.persistence.AnswerTimeQueries;
import app.lumastar.persistence.ContentCatalog;
import app.lumastar.persistence.SrsCardStore;
import app.lumastar.persistence.SrsCardStore.Review;
import app.lumastar.persistence.SrsCardStore.SchedulerSettings;
import app.lumastar.persistence.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Reviews the FSRS cards of the items a first answer practised (PRD F8): missing cards are created, every card is
 * rated by {@link AnswerRatings} and scheduled with the learner's settings, and every review is logged.
 */
@Component
class CardReviews {

    private final SrsCardStore cards;
    private final AnswerTimeQueries answerTimes;
    private final ContentCatalog catalog;
    private final UserRepository users;
    private final SpacedRepetitionSchedulerFactory schedulers;

    CardReviews(SrsCardStore cards, AnswerTimeQueries answerTimes, ContentCatalog catalog, UserRepository users,
                SpacedRepetitionSchedulerFactory schedulers) {
        this.cards = cards;
        this.answerTimes = answerTimes;
        this.catalog = catalog;
        this.users = users;
        this.schedulers = schedulers;
    }

    /** @return the rating of the answer as a whole */
    Rating review(UUID userId, Exercise exercise, Answer answer, Outcome outcome, UUID attemptId, Instant answeredAt) {
        // Stored with microseconds; reviewing at the stored time lets a replay of the log reproduce every card exactly.
        Instant reviewedAt = answeredAt.truncatedTo(ChronoUnit.MICROS);
        Map<String, SrsCard> current = cards.lockCards(userId, exercise.itemIds());
        Set<String> known = current.values().stream().filter(SrsCard::isKnown).map(SrsCard::itemId).collect(Collectors.toSet());
        Optional<Duration> typicalTime = RatingPolicy.typicalTime(
                answerTimes.recentFirstAttempts(userId, exercise.type(), RatingPolicy.RECENT_ANSWERS, attemptId));
        AnswerRatings ratings = AnswerRatings.of(exercise, answer, outcome, typicalTime, known, pairItems(exercise));
        SchedulerSettings settings = cards.settings(users.findById(userId).orElseThrow(), schedulers.version());
        SpacedRepetitionScheduler scheduler = schedulers.create(settings.settings());
        int responseMs = Math.toIntExact(answer.responseTime().toMillis());
        ratings.items().forEach((itemId, rating) -> {
            SrsCard before = current.getOrDefault(itemId, SrsCard.newCard(itemId, reviewedAt));
            SrsCard after = scheduler.review(before, rating, reviewedAt);
            UUID cardId = cards.save(userId, after, reviewedAt);
            cards.log(userId, new Review(cardId, attemptId, rating, reviewedAt, responseMs, before, after, scheduler.version(),
                    settings));
        });
        return ratings.answer();
    }

    /** Match pairs rate their items pair by pair and need the items' forms for that. */
    private Map<String, Item> pairItems(Exercise exercise) {
        if (exercise.type() != ExerciseType.MATCH_PAIRS) {
            return Map.of();
        }
        return catalog.items(exercise.itemIds()).stream().collect(Collectors.toMap(Item::id, Function.identity()));
    }
}
