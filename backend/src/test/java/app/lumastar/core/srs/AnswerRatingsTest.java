package app.lumastar.core.srs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;

import app.lumastar.domain.Answer;
import app.lumastar.domain.AnswerLang;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExercisePayload;
import app.lumastar.domain.ExerciseSource;
import app.lumastar.domain.Item;
import app.lumastar.domain.ItemKind;
import app.lumastar.domain.Level;
import app.lumastar.domain.MatchPair;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.Prompt;
import app.lumastar.domain.Rating;
import app.lumastar.domain.SkillTag;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class AnswerRatingsTest {

    private static final Optional<Duration> TYPICAL = Optional.of(Duration.ofSeconds(6));
    private static final Duration FAST = Duration.ofSeconds(1);
    private static final Map<String, Item> ITEMS = items(
            item("item_po", "po"), item("item_jo", "jo"), item("item_miredita", "mirëdita"),
            item("item_shpi", "shpi", "shpija"), item("item_nane", "nânë", "nâna"));

    @Test
    void ratesEveryItemOfTheExerciseLikeTheAnswer() {
        Exercise exercise = translation(List.of("item_shpi", "item_nane"));

        AnswerRatings ratings = AnswerRatings.of(exercise, text(Duration.ofSeconds(5)), Outcome.ALMOST_CORRECT, TYPICAL,
                Set.of(), ITEMS);

        assertThat(ratings.answer()).isEqualTo(Rating.HARD);
        assertThat(ratings.items()).containsExactly(entry("item_shpi", Rating.HARD), entry("item_nane", Rating.HARD));
    }

    @Test
    void aFastCorrectAnswerIsEasyOnlyForTheKnownItems() {
        Exercise exercise = translation(List.of("item_shpi", "item_nane"));

        AnswerRatings ratings = AnswerRatings.of(exercise, text(FAST), Outcome.CORRECT, TYPICAL, Set.of("item_shpi"), ITEMS);

        assertThat(ratings.items()).containsExactly(entry("item_shpi", Rating.EASY), entry("item_nane", Rating.GOOD));
        assertThat(ratings.answer()).as("not every item is known").isEqualTo(Rating.GOOD);
        assertThat(AnswerRatings.of(exercise, text(FAST), Outcome.CORRECT, TYPICAL, Set.of("item_shpi", "item_nane"), ITEMS)
                .answer()).isEqualTo(Rating.EASY);
    }

    @Test
    void anExerciseWithoutItemsRatesOnlyTheAnswer() {
        AnswerRatings ratings = AnswerRatings.of(translation(List.of()), text(FAST), Outcome.CORRECT, TYPICAL, Set.of(), ITEMS);

        assertThat(ratings.answer()).isEqualTo(Rating.GOOD);
        assertThat(ratings.items()).isEmpty();
    }

    @Test
    void wrongMatchesRateTheConfusedItemsAgainAndTheOthersGood() {
        Exercise exercise = pairs(List.of("item_po", "item_jo", "item_miredita", "item_shpi", "item_nane"),
                pair("po", "ja"), pair("jo", "nein"), pair("Mirëdita!", "guten Tag"), pair("shpija", "das Haus"),
                pair("nâna", "die Mutter"));

        AnswerRatings ratings = AnswerRatings.of(exercise, wrongMatches(pair("po", "nein")), Outcome.WRONG, TYPICAL,
                Set.of("item_shpi"), ITEMS);

        assertThat(ratings.answer()).isEqualTo(Rating.AGAIN);
        assertThat(ratings.items()).containsExactly(entry("item_po", Rating.AGAIN), entry("item_jo", Rating.AGAIN),
                entry("item_miredita", Rating.GOOD), entry("item_shpi", Rating.GOOD), entry("item_nane", Rating.GOOD));
    }

    @Test
    void aPairWithoutAMatchingFormBelongsToTheItemAtItsPosition() {
        Exercise exercise = pairs(List.of("item_po", "item_jo", "item_miredita", "item_shpi", "item_nane"),
                pair("ai âsht", "er ist"), pair("ajo âsht", "sie ist"), pair("ju jeni", "ihr seid"), pair("ata janë", "sie sind"),
                pair("ato janë", "sie sind (f)"));

        AnswerRatings ratings = AnswerRatings.of(exercise, wrongMatches(pair("ai âsht", "sie ist")), Outcome.WRONG, TYPICAL,
                Set.of(), ITEMS);

        assertThat(ratings.items()).containsExactly(entry("item_po", Rating.AGAIN), entry("item_jo", Rating.AGAIN),
                entry("item_miredita", Rating.GOOD), entry("item_shpi", Rating.GOOD), entry("item_nane", Rating.GOOD));
    }

    @Test
    void ratesEveryItemAgainWhenAConfusedPairBelongsToNoItem() {
        Exercise exercise = pairs(List.of("item_po", "item_jo"), pair("po", "ja"), pair("jo", "nein"), pair("ai âsht", "er ist"),
                pair("ata janë", "sie sind"), pair("ju jeni", "ihr seid"));

        AnswerRatings ratings = AnswerRatings.of(exercise, wrongMatches(pair("ai âsht", "sie sind")), Outcome.WRONG, TYPICAL,
                Set.of(), ITEMS);

        assertThat(ratings.items()).containsExactly(entry("item_po", Rating.AGAIN), entry("item_jo", Rating.AGAIN));
    }

    @Test
    void pairsWithoutWrongMatchesAreRatedLikeAnyCorrectAnswer() {
        Exercise exercise = pairs(List.of("item_po", "item_jo"), pair("po", "ja"), pair("jo", "nein"), pair("ai âsht", "er ist"),
                pair("ata janë", "sie sind"), pair("ju jeni", "ihr seid"));

        AnswerRatings ratings = AnswerRatings.of(exercise, new Answer.WrongMatches(List.of(), FAST), Outcome.CORRECT, TYPICAL,
                Set.of("item_po"), ITEMS);

        assertThat(ratings.items()).containsExactly(entry("item_po", Rating.EASY), entry("item_jo", Rating.GOOD));
    }

    private static Answer text(Duration responseTime) {
        return new Answer.Text("Shpija âsht e madhe.", responseTime);
    }

    private static Answer wrongMatches(MatchPair... matches) {
        return new Answer.WrongMatches(List.of(matches), Duration.ofSeconds(8));
    }

    private static MatchPair pair(String left, String right) {
        return new MatchPair(left, right);
    }

    private static Exercise translation(List<String> itemIds) {
        return exercise(itemIds, new ExercisePayload.TranslateFree(AnswerLang.GHEG, List.of("Shpija âsht e madhe."), List.of()));
    }

    private static Exercise pairs(List<String> itemIds, MatchPair... pairs) {
        return exercise(itemIds, new ExercisePayload.MatchPairs(List.of(pairs)));
    }

    private static Exercise exercise(List<String> itemIds, ExercisePayload payload) {
        return new Exercise("ex_a1_u01_001", Level.A1_1, 1, List.of(SkillTag.of("vocab.home")), itemIds, null,
                new Prompt(AnswerLang.GERMAN, "Übersetze."), "Erklärung.", List.of(), ExerciseSource.MANUAL, false, null, payload);
    }

    private static Item item(String id, String gheg) {
        return item(id, gheg, null);
    }

    private static Item item(String id, String gheg, String definite) {
        return new Item(id, ItemKind.WORD, gheg, "Bedeutung", null, null, definite, null, List.of(), null, false);
    }

    private static Map<String, Item> items(Item... items) {
        return List.of(items).stream().collect(Collectors.toMap(Item::id, Function.identity()));
    }
}
