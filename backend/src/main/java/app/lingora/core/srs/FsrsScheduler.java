package app.lingora.core.srs;

import app.lingora.domain.CardState;
import app.lingora.domain.Rating;
import app.lingora.domain.SrsCard;
import io.github.openspacedrepetition.Card;
import io.github.openspacedrepetition.Scheduler;
import io.github.openspacedrepetition.State;
import java.time.Instant;
import java.util.Objects;

/**
 * FSRS-6 (21 weights) of the Open Spaced Repetition Java library, as a thin adapter between {@link SrsCard} and the
 * library card (PRD F8). The library's defaults apply: learning steps of 1 and 10 minutes, a relearning step of
 * 10 minutes and interval fuzzing. The library has no "new" state and no review counters: a new card enters as a
 * learning card at step 0, and {@code reps} and {@code lapses} (a failed review in the review state) are counted here.
 * <p>
 * The fuzz of a review is seeded by the item and its review count, so that a review is reproducible and replaying the
 * review log yields the same cards.
 */
public final class FsrsScheduler implements SpacedRepetitionScheduler {

    public static final String VERSION = "fsrs-6/java-fsrs-1.0.0";
    public static final int WEIGHT_COUNT = 21;

    private final SrsSettings settings;
    private final double[] weights;

    public FsrsScheduler(SrsSettings settings) {
        this.settings = Objects.requireNonNull(settings, "settings");
        if (!settings.weights().isEmpty() && settings.weights().size() != WEIGHT_COUNT) {
            throw new IllegalArgumentException("FSRS-6 takes %d weights, found %d".formatted(WEIGHT_COUNT, settings.weights().size()));
        }
        this.weights = settings.weights().stream().mapToDouble(Double::doubleValue).toArray();
    }

    @Override
    public SrsCard review(SrsCard card, Rating rating, Instant now) {
        Card reviewed = scheduler(Objects.hash(card.itemId(), card.reps())).reviewCard(toLibrary(card), toLibrary(rating), now).card();
        boolean lapse = card.state() == CardState.REVIEW && rating == Rating.AGAIN;
        return new SrsCard(card.itemId(), fromLibrary(reviewed.getState()), reviewed.getStep(), reviewed.getStability(),
                reviewed.getDifficulty(), reviewed.getDue(), reviewed.getLastReview(), card.reps() + 1,
                card.lapses() + (lapse ? 1 : 0));
    }

    @Override
    public String version() {
        return VERSION;
    }

    public static SpacedRepetitionSchedulerFactory factory() {
        return new SpacedRepetitionSchedulerFactory() {
            @Override
            public SpacedRepetitionScheduler create(SrsSettings settings) {
                return new FsrsScheduler(settings);
            }

            @Override
            public String version() {
                return VERSION;
            }
        };
    }

    private Scheduler scheduler(int fuzzSeed) {
        Scheduler.Builder builder = Scheduler.builder()
                .desiredRetention(settings.requestRetention())
                .enableFuzzing(true)
                .randomSeedNumber(fuzzSeed);
        if (weights.length > 0) {
            builder.parameters(weights.clone());
        }
        return builder.build();
    }

    // The library would derive a missing card id from the clock and sleep a millisecond; the id plays no part here.
    private static Card toLibrary(SrsCard card) {
        Card.Builder builder = Card.builder().cardId(0).due(card.due());
        if (card.state() == CardState.NEW) {
            return builder.state(State.LEARNING).step(0).build();
        }
        return builder.state(toLibrary(card.state()))
                .step(card.step())
                .stability(card.stability())
                .difficulty(card.difficulty())
                .lastReview(card.lastReview())
                .build();
    }

    private static State toLibrary(CardState state) {
        return switch (state) {
            case NEW, LEARNING -> State.LEARNING;
            case REVIEW -> State.REVIEW;
            case RELEARNING -> State.RELEARNING;
        };
    }

    private static CardState fromLibrary(State state) {
        return switch (state) {
            case LEARNING -> CardState.LEARNING;
            case REVIEW -> CardState.REVIEW;
            case RELEARNING -> CardState.RELEARNING;
        };
    }

    private static io.github.openspacedrepetition.Rating toLibrary(Rating rating) {
        return switch (rating) {
            case AGAIN -> io.github.openspacedrepetition.Rating.AGAIN;
            case HARD -> io.github.openspacedrepetition.Rating.HARD;
            case GOOD -> io.github.openspacedrepetition.Rating.GOOD;
            case EASY -> io.github.openspacedrepetition.Rating.EASY;
        };
    }
}
