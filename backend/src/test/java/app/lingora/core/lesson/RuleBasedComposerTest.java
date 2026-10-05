package app.lingora.core.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.domain.AnswerLang;
import app.lingora.domain.CardState;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload;
import app.lingora.domain.ExerciseSource;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.Level;
import app.lingora.domain.MatchPair;
import app.lingora.domain.Prompt;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SkillTagErrorRate;
import app.lingora.domain.SrsCard;
import app.lingora.domain.Stage;
import app.lingora.domain.Unit;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class RuleBasedComposerTest {

    private static final LearnerProfile LEARNER = new LearnerProfile(UUID.randomUUID(), "Erza", Set.of(), 10, Level.A1_1, 0);
    private static final List<ExerciseType> P0_TYPES = List.of(ExerciseType.MULTIPLE_CHOICE, ExerciseType.TRANSLATE_WORDBANK,
            ExerciseType.TRANSLATE_FREE, ExerciseType.FILL_GAP, ExerciseType.MATCH_PAIRS, ExerciseType.WORD_ORDER);
    private static final SkillTag GREETINGS = SkillTag.of("vocab.greetings");
    private static final SkillTag CASES = SkillTag.of("grammar.case");
    private static final SkillTag NUMBERS = SkillTag.of("vocab.numbers");
    private static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");

    /** The exercises of the unit being played. */
    private final List<Exercise> unitExercises = new ArrayList<>();
    /** The lesson exercises of all other units, as the bank serves them. */
    private final List<Exercise> otherUnits = new ArrayList<>();

    @Nested
    class NewContent {

        @Test
        void takesAllExercisesOfASmallUnit() {
            addToUnit(ExerciseType.TRANSLATE_FREE, 2, 3);
            addToUnit(ExerciseType.MULTIPLE_CHOICE, 1, 2);

            assertThat(compose(1, firstLesson())).containsExactlyInAnyOrderElementsOf(unitExercises);
        }

        @Test
        void takesTwelveDistinctExercisesOfALargeUnit() {
            P0_TYPES.forEach(type -> addToUnit(type, 1, 4));

            List<Exercise> lesson = compose(1, firstLesson());

            assertThat(lesson).hasSize(RuleBasedComposer.LESSON_SIZE).doesNotHaveDuplicates();
            assertThat(unitExercises).containsAll(lesson);
        }

        @Test
        void ordersByRisingDifficulty() {
            P0_TYPES.forEach(type -> {
                addToUnit(type, 3, 1);
                addToUnit(type, 1, 1);
                addToUnit(type, 2, 1);
            });

            for (int seed = 0; seed < 20; seed++) {
                assertThat(compose(seed, firstLesson()).stream().map(Exercise::difficulty).toList()).isSorted();
            }
        }

        @Test
        void showsEveryTypeOfTheUnit() {
            addToUnit(ExerciseType.TRANSLATE_FREE, 1, 15);
            P0_TYPES.stream().filter(type -> type != ExerciseType.TRANSLATE_FREE).forEach(type -> addToUnit(type, 1, 1));

            for (int seed = 0; seed < 20; seed++) {
                assertThat(compose(seed, firstLesson()).stream().map(Exercise::type).distinct())
                        .containsExactlyInAnyOrderElementsOf(P0_TYPES);
            }
        }

        @Test
        void alternatesTypesWherePossible() {
            addToUnit(ExerciseType.MULTIPLE_CHOICE, 1, 6);
            addToUnit(ExerciseType.TRANSLATE_FREE, 1, 6);

            for (int seed = 0; seed < 20; seed++) {
                List<Exercise> lesson = compose(seed, firstLesson());
                IntStream.range(1, lesson.size())
                        .forEach(i -> assertThat(lesson.get(i).type()).isNotEqualTo(lesson.get(i - 1).type()));
            }
        }

        @Test
        void prefersExercisesNotPractisedYet() {
            P0_TYPES.forEach(type -> addToUnit(type, 1, 4));
            Set<String> practised = unitExercises.stream().limit(12).map(Exercise::id).collect(Collectors.toSet());

            List<Exercise> lesson = compose(7, context(practised, List.of()));

            assertThat(lesson).extracting(Exercise::id).doesNotContainAnyElementsOf(practised);
        }

        @Test
        void startsAUnitWithItsEasierExercises() {
            P0_TYPES.forEach(type -> {
                addToUnit(type, 1, 1);
                addToUnit(type, 2, 1);
                addToUnit(type, 3, 1);
            });

            assertThat(compose(3, firstLesson())).extracting(Exercise::difficulty).containsOnly(1, 2);
        }

        @Test
        void isDeterministicForAGivenSeedAndVariesAcrossSeeds() {
            P0_TYPES.forEach(type -> addToUnit(type, 1, 3));

            assertThat(compose(42, firstLesson())).isEqualTo(compose(42, firstLesson()));
            assertThat(IntStream.range(0, 10).mapToObj(seed -> compose(seed, firstLesson())).distinct().count()).isGreaterThan(1);
        }

        @Test
        void composesNothingForASkeletonUnit() {
            assertThat(compose(1, firstLesson())).isEmpty();
        }
    }

    @Nested
    class DifficultyAdaptation {

        @Test
        void twoLessonsAboveNinetyPercentMakeTheLessonHarder() {
            P0_TYPES.forEach(type -> {
                addToUnit(type, 1, 2);
                addToUnit(type, 2, 1);
                addToUnit(type, 3, 1);
            });

            assertThat(compose(5, context(Set.of(), List.of(0.95, 0.92)))).extracting(Exercise::difficulty).containsOnly(2, 3);
        }

        @Test
        void twoLessonsBelowSixtyPercentMakeTheLessonEasier() {
            P0_TYPES.forEach(type -> {
                addToUnit(type, 1, 1);
                addToUnit(type, 2, 1);
                addToUnit(type, 3, 2);
            });
            Set<String> allPractised = unitExercises.stream().map(Exercise::id).collect(Collectors.toSet());

            assertThat(compose(5, context(allPractised, List.of(0.5, 0.58)))).extracting(Exercise::difficulty)
                    .containsOnly(1, 2);
        }

        @Test
        void oneStrongLessonIsNotEnough() {
            P0_TYPES.forEach(type -> {
                addToUnit(type, 1, 1);
                addToUnit(type, 2, 1);
                addToUnit(type, 3, 1);
            });

            assertThat(compose(5, context(Set.of(), List.of(0.95, 0.7)))).extracting(Exercise::difficulty).containsOnly(1, 2);
        }
    }

    @Nested
    class Mix {

        @Test
        void mixesSixtyPercentNewContentTwentyFivePercentWeakSpotsAndFifteenPercentReviews() {
            P0_TYPES.forEach(type -> addToUnit(type, 1, 4));
            addElsewhere("a1_cases", CASES, List.of(), Level.A1_1, 6);
            addElsewhere("a1_two", NUMBERS, List.of("item_dy"), Level.A1_1, 2);
            addElsewhere("a1_three", NUMBERS, List.of("item_tre"), Level.A1_1, 2);
            addElsewhere("a1_four", NUMBERS, List.of("item_kater"), Level.A1_1, 2);

            List<Exercise> lesson = compose(11, new LessonContext(LEARNER, mastery(),
                    List.of(due("item_dy", 3), due("item_tre", 2), due("item_kater", 1)),
                    List.of(new SkillTagErrorRate(CASES, 10, 6)), Set.of(), List.of()));

            assertThat(lesson).hasSize(12).doesNotHaveDuplicates();
            assertThat(lesson).filteredOn(exercise -> exercise.skillTags().contains(NUMBERS)).flatExtracting(Exercise::itemIds)
                    .as("one exercise for each of the two most overdue items").containsExactlyInAnyOrder("item_dy", "item_tre");
            assertThat(lesson).filteredOn(exercise -> exercise.skillTags().contains(CASES)).hasSize(3);
            assertThat(lesson).filteredOn(unitExercises::contains).hasSize(7);
        }

        @Test
        void fillsMissingWeakSpotsAndReviewsFromTheUnit() {
            P0_TYPES.forEach(type -> addToUnit(type, 1, 4));
            addElsewhere("a1_cases", CASES, List.of(), Level.A1_1, 1);

            List<Exercise> lesson = compose(11, new LessonContext(LEARNER, mastery(), List.of(),
                    List.of(new SkillTagErrorRate(CASES, 10, 6)), Set.of(), List.of()));

            assertThat(lesson).hasSize(12);
            assertThat(lesson).filteredOn(unitExercises::contains).hasSize(11);
        }

        @Test
        void takesWeakSpotsAndReviewsAtOrBelowTheLearnersLevelOnly() {
            P0_TYPES.forEach(type -> addToUnit(type, 1, 4));
            addElsewhere("a2_cases", CASES, List.of("item_dy"), Level.A2_1, 6);

            List<Exercise> lesson = compose(11, new LessonContext(LEARNER, mastery(), List.of(due("item_dy", 3)),
                    List.of(new SkillTagErrorRate(CASES, 10, 6)), Set.of(), List.of()));

            assertThat(lesson).hasSize(12).allMatch(unitExercises::contains);
        }

        @Test
        void takesWeakSpotsFromOtherUnitsOnly() {
            P0_TYPES.forEach(type -> addToUnit(type, 1, 4));

            List<Exercise> lesson = compose(11, new LessonContext(LEARNER, mastery(), List.of(),
                    List.of(new SkillTagErrorRate(GREETINGS, 10, 6)), Set.of(), List.of()));

            assertThat(lesson).hasSize(12).allMatch(unitExercises::contains);
        }

        @Test
        void spreadsTheWeakSpotsOverTheWeakestTags() {
            P0_TYPES.forEach(type -> addToUnit(type, 1, 4));
            addElsewhere("a1_cases", CASES, List.of(), Level.A1_1, 6);
            addElsewhere("a1_numbers", NUMBERS, List.of(), Level.A1_1, 6);

            List<Exercise> lesson = compose(11, new LessonContext(LEARNER, mastery(NUMBERS, 0.3), List.of(),
                    List.of(new SkillTagErrorRate(CASES, 10, 6)), Set.of(), List.of()));

            assertThat(lesson).filteredOn(exercise -> exercise.skillTags().contains(CASES)).hasSize(2);
            assertThat(lesson).filteredOn(exercise -> exercise.skillTags().contains(NUMBERS)).hasSize(1);
        }
    }

    @Nested
    class Reviews {

        @Test
        void coverTheDueItemsMostOverdueFirstWithUpToTwelveExercises() {
            for (int item = 1; item <= 15; item++) {
                addElsewhere("a1_words_" + item, GREETINGS, List.of("item_word_" + item), Level.A1_1, 2);
            }
            List<SrsCard> due = IntStream.rangeClosed(1, 15).mapToObj(item -> due("item_word_" + item, 20 - item)).toList();

            List<Exercise> lesson = composer(4).composeReview(new LessonContext(LEARNER, mastery(), due, List.of(), Set.of(),
                    List.of()));

            assertThat(lesson).hasSize(12);
            assertThat(lesson).flatExtracting(Exercise::itemIds).containsExactlyInAnyOrderElementsOf(
                    IntStream.rangeClosed(1, 12).mapToObj(item -> "item_word_" + item).toList());
            assertThat(lesson.stream().map(Exercise::type).distinct().count()).isGreaterThan(1);
        }

        @Test
        void preferExercisesThatCoverSeveralDueItems() {
            addElsewhere("a1_single", GREETINGS, List.of("item_po"), Level.A1_1, 3);
            addElsewhere("a1_both", GREETINGS, List.of("item_po", "item_jo"), Level.A1_1, 1);

            List<Exercise> lesson = composer(4).composeReview(new LessonContext(LEARNER, mastery(),
                    List.of(due("item_po", 2), due("item_jo", 1)), List.of(), Set.of(), List.of()));

            assertThat(lesson).singleElement().satisfies(exercise -> assertThat(exercise.itemIds()).hasSize(2));
        }

        @Test
        void areEmptyWhenNothingDueCanBePractised() {
            addElsewhere("a2_words", GREETINGS, List.of("item_dy"), Level.A2_1, 2);

            assertThat(composer(4).composeReview(firstLesson())).isEmpty();
            assertThat(composer(4).composeReview(new LessonContext(LEARNER, mastery(), List.of(due("item_dy", 1)), List.of(),
                    Set.of(), List.of()))).isEmpty();
        }
    }

    @Nested
    class Checkpoints {

        @Test
        void takeFifteenExercisesFromEveryUnitOfTheStageHarderOnesFirst() {
            Stage stage = new Stage(Level.A1_1, "Erste Gespräche", List.of(
                    unit("a1_greetings", exercises("a1_greetings", 3, 2, 1)),
                    unit("a1_family", exercises("a1_family", 3, 2, 2)),
                    unit("a1_numbers", exercises("a1_numbers", 5, 1, 1))));

            List<Exercise> checkpoint = composer(9).composeCheckpoint(stage, firstLesson());

            assertThat(checkpoint).hasSize(RuleBasedComposer.CHECKPOINT_SIZE).doesNotHaveDuplicates();
            Map<String, Long> perUnit = checkpoint.stream().collect(Collectors.groupingBy(
                    exercise -> exercise.id().substring(3, exercise.id().lastIndexOf('_')), Collectors.counting()));
            assertThat(perUnit).containsOnly(Map.entry("a1_greetings", 5L), Map.entry("a1_family", 5L),
                    Map.entry("a1_numbers", 5L));
            // every unit gives its harder exercises first: 3, 4 and 2 of its 5
            assertThat(checkpoint).filteredOn(exercise -> exercise.difficulty() == 1).hasSize(2 + 1 + 3);
            assertThat(checkpoint.stream().map(Exercise::difficulty).toList()).isSorted();
        }

        @Test
        void takeEveryExerciseOfASmallStage() {
            Stage stage = new Stage(Level.A1_1, "Erste Gespräche", List.of(unit("a1_greetings", exercises("a1_greetings", 3, 1, 0))));

            assertThat(composer(9).composeCheckpoint(stage, firstLesson())).hasSize(4);
        }

        @ParameterizedTest
        @CsvSource({"0, 0", "4, 4", "15, 15", "16, 15", "300, 15"})
        void knowTheirLengthFromTheExercisesOfTheStage(int stageExercises, int length) {
            Stage stage = new Stage(Level.A1_1, "Erste Gespräche", List.of(
                    unit("a1_greetings", exercises("a1_greetings", stageExercises / 2, 0, 0)),
                    unit("a1_family", exercises("a1_family", 0, stageExercises - stageExercises / 2, 0))));

            assertThat(composer(9).checkpointLength(stageExercises)).isEqualTo(length);
            assertThat(composer(9).composeCheckpoint(stage, firstLesson())).hasSize(length);
        }
    }

    @Test
    void aFocusLessonPlaysTheExercisesOfItsTag() {
        P0_TYPES.forEach(type -> addToUnit(type, 1, 3));
        Unit focus = new Unit("focus_vocab_greetings_1", Level.A1_1, "Fokus", null, List.of(), List.of(GREETINGS), null, null,
                1, List.of(), List.of(), unitExercises);

        List<Exercise> lesson = composer(2).composeFocus(focus, firstLesson());

        assertThat(lesson).hasSize(12).allMatch(unitExercises::contains);
    }

    private List<Exercise> compose(int seed, LessonContext context) {
        return composer(seed).compose(unit("a1_u01_greetings", unitExercises), context);
    }

    private RuleBasedComposer composer(int seed) {
        return new RuleBasedComposer(new Random(seed), new ListBank(otherUnits));
    }

    private static LessonContext firstLesson() {
        return LessonContext.firstLesson(LEARNER);
    }

    private static LessonContext context(Set<String> practised, List<Double> recentAccuracies) {
        return new LessonContext(LEARNER, mastery(), List.of(), List.of(), practised, recentAccuracies);
    }

    private static SkillMastery mastery(Object... tagsAndValues) {
        Map<SkillTag, SkillMastery.Entry> entries = new HashMap<>();
        for (int i = 0; i < tagsAndValues.length; i += 2) {
            entries.put((SkillTag) tagsAndValues[i], new SkillMastery.Entry((Double) tagsAndValues[i + 1], 10, 3, NOW));
        }
        return new SkillMastery(entries);
    }

    private static SrsCard due(String itemId, int daysOverdue) {
        return new SrsCard(itemId, CardState.REVIEW, null, 3.0, 5.0, NOW.minusSeconds(86_400L * daysOverdue), NOW.minusSeconds(864_000),
                2, 0);
    }

    private static Unit unit(String id, List<Exercise> exercises) {
        return new Unit(id, Level.A1_1, "Einheit " + id, null, List.of(), List.of(), null, null, null, List.of(), List.of(),
                exercises);
    }

    private void addToUnit(ExerciseType type, int difficulty, int count) {
        for (int i = 0; i < count; i++) {
            unitExercises.add(exercise("ex_a1_u01_greetings_%03d".formatted(unitExercises.size() + 1), type, difficulty,
                    GREETINGS, List.of(), Level.A1_1));
        }
    }

    private void addElsewhere(String unitId, SkillTag tag, List<String> itemIds, Level level, int count) {
        for (int i = 0; i < count; i++) {
            otherUnits.add(exercise("ex_%s_%03d".formatted(unitId, i + 1), P0_TYPES.get(i % P0_TYPES.size()), 1, tag, itemIds, level));
        }
    }

    /** {@code d1}, {@code d2} and {@code d3} exercises of difficulty 1, 2 and 3, of rotating types. */
    private static List<Exercise> exercises(String unitId, int d1, int d2, int d3) {
        List<Exercise> exercises = new ArrayList<>();
        int[] counts = {d1, d2, d3};
        for (int difficulty = 1; difficulty <= 3; difficulty++) {
            for (int i = 0; i < counts[difficulty - 1]; i++) {
                exercises.add(exercise("ex_%s_%03d".formatted(unitId, exercises.size() + 1),
                        P0_TYPES.get(exercises.size() % P0_TYPES.size()), difficulty, GREETINGS, List.of(), Level.A1_1));
            }
        }
        return exercises;
    }

    private static Exercise exercise(String id, ExerciseType type, int difficulty, SkillTag tag, List<String> itemIds,
                                     Level level) {
        return new Exercise(id, level, difficulty, List.of(tag), itemIds, null, new Prompt(AnswerLang.GERMAN, "Aufgabe " + id),
                "Erklärung.", List.of(), ExerciseSource.MANUAL, false, null, payload(type));
    }

    private static ExercisePayload payload(ExerciseType type) {
        return switch (type) {
            case MULTIPLE_CHOICE -> new ExercisePayload.MultipleChoice(List.of("po", "jo", "mirë", "si"), List.of("po"));
            case TRANSLATE_WORDBANK -> new ExercisePayload.TranslateWordbank(AnswerLang.GHEG, List.of("Mirë jam."),
                    List.of("Mirë", "jam", "je", "jeni"));
            case TRANSLATE_FREE -> new ExercisePayload.TranslateFree(AnswerLang.GHEG, List.of("Si je?"), List.of());
            case FILL_GAP -> new ExercisePayload.FillGap(AnswerLang.GHEG, "Mirë ___.", List.of("jam"), List.of(), List.of());
            case MATCH_PAIRS -> new ExercisePayload.MatchPairs(List.of(new MatchPair("po", "ja"), new MatchPair("jo", "nein"),
                    new MatchPair("mirë", "gut"), new MatchPair("si", "wie"), new MatchPair("jam", "ich bin")));
            case WORD_ORDER -> new ExercisePayload.WordOrder(AnswerLang.GHEG, List.of("Mirë", "jam"), List.of("Mirë jam."));
            default -> throw new IllegalArgumentException("no test payload for " + type);
        };
    }

    /** The bank as the database serves it: by tag or item, not above the level, ordered by id. */
    private record ListBank(List<Exercise> exercises) implements ExerciseBank {

        @Override
        public List<Exercise> withSkillTag(SkillTag tag, Level maxLevel) {
            return exercises.stream().filter(exercise -> exercise.skillTags().contains(tag) && !exercise.level().isAbove(maxLevel))
                    .sorted(Comparator.comparing(Exercise::id)).toList();
        }

        @Override
        public List<Exercise> withItems(Collection<String> itemIds, Level maxLevel) {
            return exercises.stream()
                    .filter(exercise -> exercise.itemIds().stream().anyMatch(itemIds::contains) && !exercise.level().isAbove(maxLevel))
                    .sorted(Comparator.comparing(Exercise::id)).toList();
        }
    }
}
