package app.lingora.core.srs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.lingora.domain.CardState;
import app.lingora.domain.Rating;
import app.lingora.domain.SrsCard;
import io.github.openspacedrepetition.Card;
import io.github.openspacedrepetition.Scheduler;
import io.github.openspacedrepetition.State;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.junit.jupiter.api.Test;

class FsrsSchedulerTest {

    private static final Instant START = Instant.parse("2026-10-05T08:00:00Z");
    private static final String ITEM = "item_shpi";

    private final FsrsScheduler scheduler = new FsrsScheduler(SrsSettings.DEFAULT);

    @Test
    void aNewCardEntersTheFirstLearningStep() {
        SrsCard card = scheduler.review(SrsCard.newCard(ITEM, START), Rating.GOOD, START);

        assertThat(card.state()).isEqualTo(CardState.LEARNING);
        assertThat(card.step()).isEqualTo(1);
        assertThat(card.due()).isEqualTo(START.plus(Duration.ofMinutes(10)));
        assertThat(card.lastReview()).isEqualTo(START);
        assertThat(card.stability()).isPositive();
        assertThat(card.difficulty()).isBetween(1.0, 10.0);
        assertThat(card.reps()).isEqualTo(1);
        assertThat(card.lapses()).isZero();
    }

    @Test
    void schedulesExactlyLikeTheLibraryWithTheSameFuzzSeed() {
        List<Rating> ratings = List.of(Rating.GOOD, Rating.GOOD, Rating.HARD, Rating.AGAIN, Rating.GOOD, Rating.EASY, Rating.GOOD);
        Scheduler.Builder library = Scheduler.builder().desiredRetention(0.9).enableFuzzing(true);

        SrsCard card = SrsCard.newCard(ITEM, START);
        Card libraryCard = Card.builder().cardId(0).state(State.LEARNING).step(0).due(START).build();
        for (Rating rating : ratings) {
            Instant now = card.due();
            int seed = Objects.hash(ITEM, card.reps());
            card = scheduler.review(card, rating, now);
            libraryCard = library.randomSeedNumber(seed).build()
                    .reviewCard(libraryCard, io.github.openspacedrepetition.Rating.valueOf(rating.name()), now).card();

            assertThat(card.state().name()).isEqualTo(libraryCard.getState().name());
            assertThat(card.step()).isEqualTo(libraryCard.getStep());
            assertThat(card.stability()).isEqualTo(libraryCard.getStability());
            assertThat(card.difficulty()).isEqualTo(libraryCard.getDifficulty());
            assertThat(card.due()).isEqualTo(libraryCard.getDue());
            assertThat(card.lastReview()).isEqualTo(libraryCard.getLastReview());
        }
        assertThat(card.reps()).isEqualTo(ratings.size());
    }

    @Test
    void graduatesAfterTheLearningStepsAndGrowsTheInterval() {
        SrsCard card = reviewAtDue(SrsCard.newCard(ITEM, START), Rating.GOOD, Rating.GOOD);

        assertThat(card.state()).isEqualTo(CardState.REVIEW);
        assertThat(card.step()).isNull();
        assertThat(card.isKnown()).isTrue();
        Duration firstInterval = Duration.between(card.lastReview(), card.due());
        SrsCard later = reviewAtDue(card, Rating.GOOD);
        assertThat(Duration.between(later.lastReview(), later.due())).isGreaterThan(firstInterval);
    }

    @Test
    void anEasyNewCardGoesStraightToReview() {
        assertThat(scheduler.review(SrsCard.newCard(ITEM, START), Rating.EASY, START).state()).isEqualTo(CardState.REVIEW);
    }

    @Test
    void countsALapseOnlyForAFailedReviewInTheReviewState() {
        SrsCard learning = scheduler.review(SrsCard.newCard(ITEM, START), Rating.AGAIN, START);
        assertThat(learning.lapses()).isZero();

        SrsCard known = reviewAtDue(learning, Rating.GOOD, Rating.GOOD);
        SrsCard lapsed = reviewAtDue(known, Rating.AGAIN);

        assertThat(lapsed.state()).isEqualTo(CardState.RELEARNING);
        assertThat(lapsed.lapses()).isEqualTo(1);
        assertThat(lapsed.reps()).isEqualTo(4);
        assertThat(lapsed.due()).isEqualTo(lapsed.lastReview().plus(Duration.ofMinutes(10)));
    }

    @Test
    void aHigherTargetRetentionSchedulesTheNextReviewSooner() {
        SrsCard strict = reviewAtDue(new FsrsScheduler(new SrsSettings(0.97, List.of())), Rating.GOOD, Rating.GOOD, Rating.GOOD);
        SrsCard relaxed = reviewAtDue(new FsrsScheduler(new SrsSettings(0.80, List.of())), Rating.GOOD, Rating.GOOD, Rating.GOOD);

        assertThat(strict.due()).isBefore(relaxed.due());
    }

    @Test
    void usesOptimisedWeights() {
        List<Double> weights = new ArrayList<>(List.of(0.2172, 1.1771, 3.2602, 16.1507, 7.0114, 0.57, 2.0966, 0.0069, 1.5261,
                0.112, 1.0178, 1.849, 0.1133, 0.3127, 2.2934, 0.2191, 3.0004, 0.7536, 0.3332, 0.1437, 0.2));
        weights.set(2, 5.0);

        SrsCard card = new FsrsScheduler(new SrsSettings(0.9, weights)).review(SrsCard.newCard(ITEM, START), Rating.GOOD, START);

        assertThat(card.stability()).as("w2 is the initial stability of a good first review").isEqualTo(5.0);
    }

    @Test
    void rejectsAWeightSetOfAnotherFsrsVersion() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new FsrsScheduler(new SrsSettings(0.9, List.of(0.4, 0.6, 2.4, 5.8))))
                .withMessageContaining("21 weights");
    }

    @Test
    void reviewsAreReproducible() {
        SrsCard card = reviewAtDue(SrsCard.newCard(ITEM, START), Rating.GOOD, Rating.GOOD, Rating.GOOD);

        assertThat(reviewAtDue(SrsCard.newCard(ITEM, START), Rating.GOOD, Rating.GOOD, Rating.GOOD)).isEqualTo(card);
        assertThat(scheduler.version()).isEqualTo("fsrs-6/java-fsrs-1.0.0");
    }

    private SrsCard reviewAtDue(SrsCard card, Rating... ratings) {
        return reviewAtDue(scheduler, card, ratings);
    }

    private static SrsCard reviewAtDue(FsrsScheduler scheduler, Rating... ratings) {
        return reviewAtDue(scheduler, SrsCard.newCard(ITEM, START), ratings);
    }

    private static SrsCard reviewAtDue(FsrsScheduler scheduler, SrsCard card, Rating... ratings) {
        SrsCard reviewed = card;
        for (Rating rating : ratings) {
            reviewed = scheduler.review(reviewed, rating, reviewed.due());
        }
        return reviewed;
    }
}
