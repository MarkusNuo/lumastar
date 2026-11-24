package app.lumastar.api.plan;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.LessonDriver;
import app.lumastar.PlacementDriver;
import app.lumastar.SpaClient;
import app.lumastar.SyntheticContent;
import app.lumastar.content.ContentBundle;
import app.lumastar.content.ContentSeeded;
import app.lumastar.content.ContentSeeder;
import app.lumastar.content.SeedSummary;
import app.lumastar.domain.Curriculum;
import app.lumastar.domain.Level;
import app.lumastar.domain.Stage;
import app.lumastar.domain.Unit;
import app.lumastar.domain.UnitColor;
import java.util.List;
import java.util.function.UnaryOperator;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/** Existing plans follow the units that a startup seed adds to or retires from the course. */
class CoursePlanRevisionTest extends IntegrationTest {

    private static final Unit MARKET = newUnit("a1_2_market", Level.A1_2, "Lebensmittel & Markt");

    @Autowired
    private ContentSeeder seeder;

    @Autowired
    private ApplicationEventPublisher events;

    @BeforeEach
    void syntheticContentWithoutLearners() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(SyntheticContent.bundle());
    }

    @Test
    void aNewUnitInTheLearnersRangeComesIntoThePlanAndTheProgressStays() {
        SpaClient erza = learnerWithProgress("Erza");
        assertThat(planVersion(erza)).isEqualTo(1);

        seed(withUnitsInStage(Level.A1_2, MARKET));

        JsonNode path = get(erza, "/api/path");
        assertThat(unitIds(get(erza, "/api/plan"))).containsSubsequence("a1_2_words", "a1_2_grammar", "a1_2_market");
        assertThat(statusOf(path, "a0_words")).isEqualTo("completed");
        assertThat(statusOf(path, "a1_1_words")).isEqualTo("in_progress");
        assertThat(unit(path, "a1_1_words").get("lessonsCompleted").asInt()).isEqualTo(1);
        assertThat(statusOf(path, "a1_2_market")).isEqualTo("planned");
        assertThat(planVersion(erza)).isEqualTo(2);
        assertThat(changesOfVersion(erza, 2)).singleElement().satisfies(change -> {
            assertThat(change.get("trigger").asString()).isEqualTo("content");
            assertThat(change.get("type").asString()).isEqualTo("replanned");
            assertThat(change.get("reason").asString()).isEqualTo("Neue Einheit im Kurs: Lebensmittel & Markt");
        });
    }

    @Test
    void theNextStartWithoutNewUnitsStoresNoNewVersion() {
        SpaClient erza = learnerWithProgress("Erza");
        seed(withUnitsInStage(Level.A1_2, MARKET));

        SeedSummary again = seed(withUnitsInStage(Level.A1_2, MARKET));

        assertThat(again.unitsChanged()).isFalse();
        assertThat(planVersion(erza)).isEqualTo(2);
    }

    @Test
    void newUnitsBelowTheLearnersLevelStoreNoNewVersion() {
        SpaClient arta = new SpaClient(mvc);
        arta.register("Arta");
        PlacementDriver driver = new PlacementDriver(arta, jdbc);
        driver.answerOnboarding("few_words");
        assertThat(driver.place(level -> !level.isAbove(Level.A1_2)).level()).isEqualTo(Level.A1_2);

        SeedSummary summary = seed(withUnitsInStage(Level.A0, newUnit("a0_market", Level.A0, "Markt")));

        assertThat(summary.unitsChanged()).isTrue();
        assertThat(planVersion(arta)).isEqualTo(1);
        assertThat(history(arta)).noneMatch(change -> change.get("trigger").asString().equals("content"));
    }

    @Test
    void aUnitRetiredFromTheCourseLeavesThePlan() {
        SpaClient erza = learnerOnA0("Erza");
        String retired = SyntheticContent.grammarUnit(Level.A1_2);

        seed(withStages(stage -> new Stage(stage.level(), stage.title(),
                stage.units().stream().filter(unit -> !unit.id().equals(retired)).toList())));

        assertThat(unitIds(get(erza, "/api/plan"))).doesNotContain(retired);
        assertThat(changesOfVersion(erza, 2)).singleElement().satisfies(change -> {
            assertThat(change.get("trigger").asString()).isEqualTo("content");
            assertThat(change.get("reason").asString()).isEqualTo("Einheit nicht mehr im Kurs: Grammatik A1.2");
        });
    }

    @Test
    void aFailingRevisionKeepsThatPlanAndRevisesTheOthers() {
        SpaClient erza = learnerOnA0("Erza");
        learnerOnA0("Arta");
        jdbc.sql("""
                UPDATE learning_plans SET plan = plan - 'stages'
                WHERE user_id = (SELECT id FROM users WHERE display_name = 'Arta')""").update();

        seed(withUnitsInStage(Level.A1_2, MARKET));

        assertThat(planVersion(erza)).isEqualTo(2);
        assertThat(jdbc.sql("""
                        SELECT max(version) FROM learning_plans
                        WHERE user_id = (SELECT id FROM users WHERE display_name = 'Arta')""")
                .query(Integer.class).single()).isEqualTo(1);
    }

    /** Seeds the bundle and announces it as the startup seed does. */
    private SeedSummary seed(ContentBundle bundle) {
        SeedSummary summary = seeder.seed(bundle);
        events.publishEvent(new ContentSeeded(summary));
        return summary;
    }

    private SpaClient learnerOnA0(String name) {
        SpaClient learner = new SpaClient(mvc);
        learner.register(name);
        new PlacementDriver(learner, jdbc).answerOnboarding("nothing");
        assertThat(learner.post("/api/placement/skip", "")).hasStatusOk();
        return learner;
    }

    /** On A0 with the A0 word unit completed and one lesson of the A1.1 word unit, which is in progress. */
    private SpaClient learnerWithProgress(String name) {
        SpaClient learner = learnerOnA0(name);
        LessonDriver lessons = new LessonDriver(learner);
        for (int i = 0; i < 4; i++) {
            lessons.play(LessonDriver.A0_WORDS, "ja");
        }
        lessons.play("""
                {"unitId": "%s"}""".formatted(SyntheticContent.wordsUnit(Level.A1_1)), "ja");
        return learner;
    }

    private static ContentBundle withUnitsInStage(Level level, Unit... units) {
        return withStages(stage -> stage.level() != level ? stage
                : new Stage(stage.level(), stage.title(), Stream.concat(stage.units().stream(), Stream.of(units)).toList()));
    }

    private static ContentBundle withStages(UnaryOperator<Stage> change) {
        ContentBundle bundle = SyntheticContent.bundle();
        List<Stage> stages = bundle.curriculum().stages().stream().map(change).toList();
        return new ContentBundle(new Curriculum(bundle.curriculum().variety(), stages), bundle.skillTags(),
                bundle.placementExercises());
    }

    private static Unit newUnit(String id, Level level, String title) {
        return new Unit(id, level, title, null, List.of(), List.of(SyntheticContent.vocab(level)), UnitColor.CORAL, "star", 4,
                List.of(), List.of(), List.of());
    }

    private static JsonNode get(SpaClient learner, String uri) {
        MvcTestResult result = learner.get(uri);
        assertThat(result).hasStatusOk();
        return PlacementDriver.body(result);
    }

    private static int planVersion(SpaClient learner) {
        return history(learner).getFirst().get("planVersion").asInt();
    }

    private static List<JsonNode> history(SpaClient learner) {
        return StreamSupport.stream(get(learner, "/api/plan/changes").spliterator(), false).toList();
    }

    private static List<JsonNode> changesOfVersion(SpaClient learner, int version) {
        return history(learner).stream().filter(change -> change.get("planVersion").asInt() == version).toList();
    }

    private static Stream<JsonNode> units(JsonNode pathOrPlan) {
        return StreamSupport.stream(pathOrPlan.get("stages").spliterator(), false)
                .flatMap(stage -> StreamSupport.stream(stage.get("units").spliterator(), false));
    }

    private static List<String> unitIds(JsonNode pathOrPlan) {
        return units(pathOrPlan).map(unit -> unit.get("unitId").asString()).toList();
    }

    private static JsonNode unit(JsonNode pathOrPlan, String unitId) {
        return units(pathOrPlan).filter(unit -> unit.get("unitId").asString().equals(unitId)).findFirst()
                .orElseThrow(() -> new AssertionError("no unit " + unitId));
    }

    private static String statusOf(JsonNode path, String unitId) {
        return unit(path, unitId).get("status").asString();
    }
}
