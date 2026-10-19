package app.lumastar.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.content.SeedSummary.Count;
import app.lumastar.core.evaluation.AnswerEvaluator;
import app.lumastar.domain.Answer;
import app.lumastar.domain.AnswerLang;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExercisePayload;
import app.lumastar.domain.ExerciseSource;
import app.lumastar.domain.Level;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.Prompt;
import app.lumastar.domain.SkillTag;
import jakarta.persistence.EntityManagerFactory;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * The importer on the repository's {@code /content}: content changes it cannot read fail the backend build. The
 * expected counts come straight from the JSON files, so they follow the content without being written down here.
 */
class RepositoryContentSeedTest extends IntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(RepositoryContentSeedTest.class);
    /** Far above the few seconds an import takes; only a pathological slowdown fails the build. */
    private static final Duration ABSURD_IMPORT_TIME = Duration.ofSeconds(30);

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    @Autowired
    private ContentProperties properties;

    @Autowired
    private AnswerEvaluator evaluator;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @BeforeEach
    void startWithoutContent() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
    }

    @Test
    void importsEveryRowOfTheContentFiles() {
        ContentFiles files = ContentFiles.read(properties.directory());

        SeedSummary summary = timedImport("first import");

        assertThat(summary).isEqualTo(new SeedSummary(created(files.skillTags()), created(files.stages()), created(files.units()),
                created(files.items()), created(files.lessonExercises() + files.placementExercises())));
        assertThat(count("SELECT count(*) FROM content_skill_tags")).isEqualTo(files.skillTags());
        assertThat(count("SELECT count(*) FROM content_stages")).isEqualTo(files.stages());
        assertThat(count("SELECT count(*) FROM content_units")).isEqualTo(files.units());
        assertThat(count("SELECT count(*) FROM content_units WHERE has_content")).isEqualTo(files.unitsWithContent());
        assertThat(count("SELECT count(*) FROM content_items")).isEqualTo(files.items());
        assertThat(count("SELECT count(*) FROM exercises WHERE pool = 'lesson'")).isEqualTo(files.lessonExercises());
        assertThat(count("SELECT count(*) FROM exercises WHERE pool = 'placement'")).isEqualTo(files.placementExercises());
    }

    @Test
    void aSecondImportOfTheSameContentWritesNothing() {
        ContentFiles files = ContentFiles.read(properties.directory());
        timedImport("first import");
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        SeedSummary secondRun = timedImport("second import");

        assertThat(statistics.getEntityInsertCount()).isZero();
        assertThat(statistics.getEntityUpdateCount()).isZero();
        assertThat(secondRun).isEqualTo(new SeedSummary(unchanged(files.skillTags()), unchanged(files.stages()),
                unchanged(files.units()), unchanged(files.items()), unchanged(files.lessonExercises() + files.placementExercises())));
        assertThat(count("SELECT count(*) FROM exercises WHERE retired_at IS NOT NULL")).isZero();
    }

    @Test
    void theEvaluatorKnowsTheStandardFormsOfTheRepositoryBlocklist() {
        Exercise gap = new Exercise("ex_a1_u04_family_001", Level.A1_1, 1, List.of(SkillTag.of("vocab.family")), List.of(), null,
                new Prompt(AnswerLang.GERMAN, "Die Mutter ist zu Hause."), "„Ist“ heisst auf Gheg „âsht“.", List.of(),
                ExerciseSource.MANUAL, false, null,
                new ExercisePayload.FillGap(AnswerLang.GHEG, "Nâna ___ në shpi.", List.of("âsht"), List.of(), List.of()));

        assertThat(evaluator.evaluate(gap, new Answer.Text("është", Duration.ofSeconds(2))).outcome())
                .isEqualTo(Outcome.CORRECT_STANDARD_FORM);
    }

    /** Loads and seeds the repository content and logs how long it took. */
    private SeedSummary timedImport(String run) {
        long start = System.nanoTime();
        SeedSummary summary = seeder.seed(loader.load(properties.directory()));
        Duration took = Duration.ofNanos(System.nanoTime() - start);
        log.info("Content {} took {} ms: {}", run, took.toMillis(), summary);
        assertThat(took).as("time of the %s", run).isLessThan(ABSURD_IMPORT_TIME);
        return summary;
    }

    private static Count created(int total) {
        return new Count(total, total, 0);
    }

    private static Count unchanged(int total) {
        return new Count(total, 0, 0);
    }

    private int count(String sql) {
        return jdbc.sql(sql).query(Integer.class).single();
    }

    /** The rows the content files describe, counted from the raw JSON. */
    private record ContentFiles(int skillTags, int stages, int units, int unitsWithContent, int items, int lessonExercises,
                                int placementExercises) {

        private static final JsonMapper JSON = JsonMapper.builder().build();

        static ContentFiles read(Path root) {
            JsonNode curriculum = json(root.resolve(ContentLoader.CURRICULUM));
            List<JsonNode> units = elements(curriculum.get("stages"))
                    .flatMap(stage -> elements(stage.get("units")))
                    .toList();
            List<JsonNode> unitFiles = units.stream()
                    .filter(unit -> unit.has("file"))
                    .map(unit -> json(root.resolve(unit.get("file").asString())))
                    .toList();
            return new ContentFiles(
                    json(root.resolve(ContentLoader.SKILL_TAGS)).get("tags").size(),
                    curriculum.get("stages").size(),
                    units.size(),
                    unitFiles.size(),
                    unitFiles.stream().mapToInt(unit -> unit.get("items").size()).sum(),
                    unitFiles.stream().mapToInt(unit -> unit.get("exercises").size()).sum(),
                    json(root.resolve(ContentLoader.PLACEMENT)).get("exercises").size());
        }

        private static JsonNode json(Path file) {
            try {
                return JSON.readTree(Files.readString(file));
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }

        private static Stream<JsonNode> elements(JsonNode array) {
            return StreamSupport.stream(array.spliterator(), false);
        }
    }
}
