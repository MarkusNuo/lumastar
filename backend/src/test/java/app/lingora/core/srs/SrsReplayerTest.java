package app.lingora.core.srs;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.core.srs.SrsReplayer.LoggedReview;
import app.lingora.core.srs.SrsReplayer.Replay;
import app.lingora.domain.CardState;
import app.lingora.domain.Rating;
import app.lingora.domain.SrsCard;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SrsReplayerTest {

    private static final Instant START = Instant.parse("2026-10-05T08:00:00Z");

    private final FsrsScheduler scheduler = new FsrsScheduler(SrsSettings.DEFAULT);

    @Test
    void rebuildsTheCardsThatTheLiveReviewsProduced() {
        Map<String, SrsCard> live = new HashMap<>();
        List<LoggedReview> log = new ArrayList<>();
        Instant now = START;
        List<Rating> ratings = List.of(Rating.GOOD, Rating.AGAIN, Rating.GOOD, Rating.HARD, Rating.EASY, Rating.GOOD, Rating.AGAIN);
        for (int day = 0; day < ratings.size(); day++) {
            for (String item : List.of("item_shpi", "item_nane", "item_baba")) {
                SrsCard before = live.getOrDefault(item, SrsCard.newCard(item, now));
                Rating rating = item.equals("item_baba") ? Rating.GOOD : ratings.get(day);
                live.put(item, scheduler.review(before, rating, now));
                log.add(new LoggedReview(item, rating, now));
                now = now.plusSeconds(7);
            }
            now = now.plus(Duration.ofDays(day + 1));
        }

        Replay replay = SrsReplayer.replay(log, scheduler);

        assertThat(replay.cards()).isEqualTo(live);
        assertThat(replay.reviews()).hasSize(log.size());
        assertThat(replay.reviews().getFirst().before()).isEqualTo(SrsCard.newCard("item_shpi", START));
        assertThat(replay.reviews().getLast().after()).isEqualTo(live.get("item_baba"));
    }

    @Test
    void replaysInTheOrderOfTheReviewTimes() {
        List<LoggedReview> log = List.of(new LoggedReview("item_shpi", Rating.GOOD, START.plus(Duration.ofMinutes(20))),
                new LoggedReview("item_shpi", Rating.AGAIN, START));

        Replay replay = SrsReplayer.replay(log, scheduler);

        assertThat(replay.reviews()).extracting(review -> review.review().rating()).containsExactly(Rating.AGAIN, Rating.GOOD);
        assertThat(replay.cards().get("item_shpi").reps()).isEqualTo(2);
        assertThat(replay.cards().get("item_shpi").state()).isEqualTo(CardState.LEARNING);
    }

    @Test
    void anotherSchedulerSettingGivesOtherCardsFromTheSameLog() {
        List<LoggedReview> log = new ArrayList<>();
        Instant now = START;
        for (int review = 0; review < 4; review++) {
            log.add(new LoggedReview("item_shpi", Rating.GOOD, now));
            now = now.plus(Duration.ofDays(3));
        }

        SrsCard relaxed = SrsReplayer.replay(log, new FsrsScheduler(new SrsSettings(0.8, List.of()))).cards().get("item_shpi");
        SrsCard strict = SrsReplayer.replay(log, new FsrsScheduler(new SrsSettings(0.95, List.of()))).cards().get("item_shpi");

        assertThat(strict.due()).isBefore(relaxed.due());
        assertThat(strict.reps()).isEqualTo(relaxed.reps()).isEqualTo(4);
    }

    @Test
    void anEmptyLogHasNoCards() {
        assertThat(SrsReplayer.replay(List.of(), scheduler).cards()).isEmpty();
    }
}
