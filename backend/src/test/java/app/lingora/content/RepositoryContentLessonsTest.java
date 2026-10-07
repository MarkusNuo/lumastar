package app.lingora.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.PlacementDriver;
import app.lingora.SpaClient;
import app.lingora.core.lesson.LessonContext;
import app.lingora.core.lesson.RuleBasedComposer;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.Item;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.Level;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SrsCard;
import app.lingora.domain.Stage;
import app.lingora.domain.Unit;
import app.lingora.persistence.ContentCatalog;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * The composer on the seeded repository content, with the database as its bank like in the app (PRD F7, F8, F10,
 * chapter 5): a fresh learner gets a full lesson of every unit with exercises, every A0–A2 stage has a full checkpoint,
 * a learner on A2.3 can practise every skill tag of the A0–A2 units, and due items make a review lesson.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class RepositoryContentLessonsTest extends IntegrationTest {

    private static final long SEED = 20261005L;
    private static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    @Autowired
    private ContentProperties properties;

    @Autowired
    private ContentCatalog catalog;

    private RuleBasedComposer composer;

    @BeforeAll
    void seedTheRepositoryContent() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        seeder.seed(loader.load(properties.directory()));
    }

    @BeforeEach
    void seededComposer() {
        composer = new RuleBasedComposer(new Random(SEED), catalog);
    }

    static Stream<String> unitsWithExercises() {
        return RepositoryContent.bundle().curriculum().units().stream().filter(unit -> !unit.isSkeleton()).map(Unit::id);
    }

    static Stream<String> skillTagsOfTheA0ToA2Units() {
        return RepositoryContent.bundle().curriculum().units().stream()
                .filter(unit -> !unit.level().isAbove(Level.A2_3))
                .flatMap(unit -> unit.exercises().stream())
                .flatMap(exercise -> exercise.skillTags().stream())
                .map(SkillTag::id)
                .distinct()
                .sorted();
    }

    @Test
    void everyUnitOfTheA0ToA2StagesHasExercises() {
        assertThat(RepositoryContent.bundle().curriculum().units())
                .filteredOn(unit -> !unit.level().isAbove(Level.A2_3))
                .isNotEmpty()
                .allSatisfy(unit -> assertThat(unit.isSkeleton()).as("%s is a skeleton", unit.id()).isFalse());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unitsWithExercises")
    void aFreshLearnerGetsAFullLessonOfEveryUnitAtItsLevel(String unitId) {
        Unit unit = catalog.activeUnit(unitId).orElseThrow();

        List<Exercise> lesson = composer.compose(unit, LessonContext.firstLesson(learnerOn(unit.level())));

        assertThat(lesson).hasSize(RuleBasedComposer.LESSON_SIZE);
        assertThat(ids(lesson)).doesNotHaveDuplicates().isSubsetOf(ids(unit.exercises()));
        assertThat(lesson).extracting(Exercise::type).containsAll(types(unit.exercises()));
    }

    @ParameterizedTest(name = "{0}")
    @EnumSource(value = Level.class, names = {"A0", "A1_.", "A2_."}, mode = EnumSource.Mode.MATCH_ANY)
    void everyA0ToA2StageHasAFullCheckpointOfHarderExercisesFromAllItsUnits(Level level) {
        Stage stage = stageWithExercises(level);

        List<Exercise> checkpoint = composer.composeCheckpoint(stage, LessonContext.firstLesson(learnerOn(level)));

        assertThat(checkpoint).hasSize(RuleBasedComposer.CHECKPOINT_SIZE);
        assertThat(ids(checkpoint)).doesNotHaveDuplicates();
        assertThat(stage.units()).allSatisfy(unit -> assertThat(ids(checkpoint)).as(unit.id()).containsAnyElementsOf(ids(unit.exercises())));
        assertThat(checkpoint).allSatisfy(exercise -> assertThat(exercise.difficulty()).isGreaterThan(Exercise.MIN_DIFFICULTY));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("skillTagsOfTheA0ToA2Units")
    void aLearnerOnA2_3CanPractiseEverySkillTagOfTheA0ToA2Units(String tagId) {
        SkillTag tag = SkillTag.of(tagId);
        List<Exercise> pool = catalog.lessonExercisesWithSkillTag(tag, Level.A2_3);

        List<Exercise> lesson = composer.composeFocus(practiceUnit(tag, pool), LessonContext.firstLesson(learnerOn(Level.A2_3)));

        assertThat(lesson).isNotEmpty().hasSize(Math.min(RuleBasedComposer.LESSON_SIZE, pool.size()))
                .allSatisfy(exercise -> assertThat(exercise.skillTags()).contains(tag));
        assertThat(ids(lesson)).doesNotHaveDuplicates();
    }

    /** Every pick covers a due item not covered yet, so the lesson covers all due items or fills up. */
    @ParameterizedTest(name = "{0}")
    @MethodSource("unitsWithExercises")
    void theDueItemsOfEveryUnitMakeAReviewLesson(String unitId) {
        Unit unit = catalog.activeUnit(unitId).orElseThrow();
        Set<String> dueItems = unit.items().stream().map(Item::id).collect(Collectors.toSet());
        List<SrsCard> dueCards = dueItems.stream().sorted().map(item -> SrsCard.newCard(item, NOW.minus(Duration.ofDays(1)))).toList();

        List<Exercise> review = composer.composeReview(new LessonContext(learnerOn(unit.level()), new SkillMastery(Map.of()),
                dueCards, List.of(), Set.of(), List.of()));

        assertThat(review).isNotEmpty().hasSizeLessThanOrEqualTo(RuleBasedComposer.LESSON_SIZE)
                .allSatisfy(exercise -> assertThat(exercise.itemIds()).containsAnyElementsOf(dueItems))
                .allSatisfy(exercise -> assertThat(exercise.level().isAbove(unit.level())).isFalse());
        assertThat(ids(review)).doesNotHaveDuplicates();
        assertThat(review.stream().flatMap(exercise -> exercise.itemIds().stream()).filter(dueItems::contains).distinct())
                .hasSizeGreaterThanOrEqualTo(Math.min(RuleBasedComposer.LESSON_SIZE, dueItems.size()));
    }

    @Test
    void aLessonPlayedThroughTheApiIsCorrectWithItsSolutionsAndItsItemsComeBackForReview() {
        jdbc.sql("DELETE FROM users").update();
        SpaClient learner = learnerOnA0();
        String unitId = unitsWithExercises().findFirst().orElseThrow();

        JsonNode lesson = started(learner.post("/api/lessons", "{\"unitId\": \"%s\"}".formatted(unitId)));
        String sessionId = lesson.get("sessionId").asString();
        for (JsonNode exercise : lesson.get("exercises")) {
            MvcTestResult attempt = learner.post("/api/lessons/%s/attempts".formatted(sessionId), attempt(exercise));
            assertThat(attempt).hasStatusOk().bodyJson().extractingPath("$.outcome").as(exercise.get("id").asString())
                    .isEqualTo("correct");
        }
        assertThat(learner.post("/api/lessons/%s/complete".formatted(sessionId), "")).hasStatusOk();
        Set<String> carded = Set.copyOf(jdbc.sql("SELECT item_id FROM srs_cards").query(String.class).list());
        jdbc.sql("UPDATE srs_cards SET due = now() - interval '1 day'").update();

        JsonNode review = started(learner.post("/api/review/lessons", ""));

        assertThat(carded).isNotEmpty();
        assertThat(elements(review.get("exercises"))).isNotEmpty().hasSizeLessThanOrEqualTo(RuleBasedComposer.LESSON_SIZE)
                .allSatisfy(exercise -> assertThat(elements(exercise.get("itemIds")).map(JsonNode::asString))
                        .containsAnyElementsOf(carded));
    }

    /** The stage as a checkpoint gets it: its units with their exercises, skeletons left out. */
    private Stage stageWithExercises(Level level) {
        Stage outline = catalog.curriculumOutline().stream().filter(stage -> stage.level() == level).findFirst().orElseThrow();
        List<Unit> units = outline.units().stream()
                .map(unit -> catalog.activeUnit(unit.id()).orElseThrow())
                .filter(unit -> !unit.isSkeleton())
                .toList();
        return new Stage(level, outline.title(), units);
    }

    /** A practice lesson is a focus composition of the tag's exercises up to the learner's level. */
    private static Unit practiceUnit(SkillTag tag, List<Exercise> pool) {
        return new Unit("practice_" + tag.id().replace('.', '_'), Level.A2_3, tag.id(), null, List.of(), List.of(tag), null,
                null, null, List.of(), List.of(), pool);
    }

    private static LearnerProfile learnerOn(Level level) {
        return new LearnerProfile(UUID.randomUUID(), "Erza", Set.of(), 10, level, 0);
    }

    private SpaClient learnerOnA0() {
        SpaClient learner = new SpaClient(mvc);
        learner.register("Erza");
        new PlacementDriver(learner, jdbc).answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
        return learner;
    }

    /** The attempt the app sends for the first solution of an exercise as the lesson shows it. */
    private static String attempt(JsonNode exercise) {
        ObjectNode attempt = PlacementDriver.JSON.createObjectNode();
        attempt.put("exerciseId", exercise.get("id").asString());
        attempt.put("responseTimeMs", 3000);
        ObjectNode answer = attempt.putObject("answer");
        String solution = exercise.has("solutions") ? exercise.get("solutions").get(0).asString() : null;
        switch (exercise.get("type").asString()) {
            case "multiple_choice" -> answer.put("choice", solution);
            case "fill_gap" -> answer.put(exercise.has("choices") ? "choice" : "text", solution);
            case "translate_free" -> answer.put("text", solution);
            case "translate_wordbank" -> List.of(solution.split("\\s+")).forEach(answer.putArray("tokens")::add);
            case "word_order" -> answer.set("tokens", exercise.get("tokens"));
            case "match_pairs" -> answer.putArray("wrongMatches");
            default -> throw new IllegalArgumentException("unknown exercise type " + exercise.get("type"));
        }
        return PlacementDriver.JSON.writeValueAsString(attempt);
    }

    private static JsonNode started(MvcTestResult result) {
        assertThat(result).hasStatus(HttpStatus.CREATED);
        return PlacementDriver.body(result);
    }

    private static Stream<JsonNode> elements(JsonNode array) {
        return StreamSupport.stream(array.spliterator(), false);
    }

    private static List<String> ids(List<Exercise> exercises) {
        return exercises.stream().map(Exercise::id).toList();
    }

    private static Set<ExerciseType> types(List<Exercise> exercises) {
        return exercises.stream().map(Exercise::type).collect(Collectors.toSet());
    }
}
