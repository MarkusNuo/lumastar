package app.lingora.api.lesson;

import app.lingora.core.srs.AnswerRatings;
import app.lingora.core.srs.RatingPolicy;
import app.lingora.core.srs.SpacedRepetitionScheduler;
import app.lingora.core.srs.SpacedRepetitionSchedulerFactory;
import app.lingora.domain.Answer;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.Item;
import app.lingora.domain.Outcome;
import app.lingora.domain.Rating;
import app.lingora.domain.SrsCard;
import app.lingora.persistence.AnswerTimeQueries;
import app.lingora.persistence.ContentCatalog;
import app.lingora.persistence.SrsCardStore;
import app.lingora.persistence.SrsCardStore.Review;
import app.lingora.persistence.SrsCardStore.SchedulerSettings;
import app.lingora.persistence.UserRepository;
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
