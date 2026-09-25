package app.lingora.content;

import static app.lingora.content.ContentFixture.GREETINGS;
import static app.lingora.content.ContentFixture.editJson;
import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.content.SeedSummary.Count;
import app.lingora.domain.Exercise;
import app.lingora.persistence.ExerciseEntity;
import app.lingora.persistence.ExercisePayloadCodec;
import app.lingora.persistence.ExerciseRepository;
import jakarta.persistence.EntityManagerFactory;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.node.ArrayNode;

class ContentSeederTest extends IntegrationTest {

    private static final List<String> CONTENT_TABLES = List.of("content_skill_tags", "content_stages", "content_units",
            "content_items", "exercises");

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    @Autowired
    private ExerciseRepository exercises;

    @Autowired
    private ExercisePayloadCodec payloadCodec;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @TempDir
    Path tempDir;

    @BeforeEach
    void startWithoutContent() {
        jdbc.sql("TRUNCATE " + String.join(", ", CONTENT_TABLES) + " CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
    }

    @Test
    void importsTheFixture() {
        SeedSummary summary = seeder.seed(loader.load(ContentFixture.path()));

        assertThat(summary).isEqualTo(new SeedSummary(new Count(7, 7, 0), new Count(2, 2, 0), new Count(3, 3, 0),
                new Count(10, 10, 0), new Count(10, 10, 0)));
        assertThat(jdbc.sql("SELECT pool || ':' || count(*) FROM exercises GROUP BY pool ORDER BY pool").query(String.class).list())
                .containsExactly("lesson:8", "placement:2");
        assertThat(jdbc.sql("SELECT id FROM content_units WHERE NOT has_content").query(String.class).list())
                .containsExactly("a1_u03_numbers");
        assertThat(jdbc.sql("SELECT string_agg(id, ',' ORDER BY position) FROM content_units").query(String.class).single())
                .isEqualTo("a1_u01_greetings,a1_u02_family,a1_u03_numbers");
    }

    @Test
    void storesExercisesWithTheCodesOfTheContentFormat() {
        seeder.seed(loader.load(ContentFixture.path()));

        assertThat(jdbc.sql("""
                        SELECT type || '|' || level || '|' || (payload ->> 'answerLang') || '|' || (payload ->> 'text')
                               || '|' || (error_hints -> 0 ->> 'category') || '|' || array_to_string(skill_tags, ',')
                        FROM exercises WHERE id = 'ex_a1_u02_001'""").query(String.class).single())
                .isEqualTo("fill_gap|A1.1|sq|Nâna ___ në shpi.|spelling.nasal_vowel|grammar.verb_be,vocab.family");
    }

    @Test
    void readsBackThePayloadItStored() {
        ContentBundle bundle = loader.load(ContentFixture.path());
        seeder.seed(bundle);

        for (Exercise exercise : allExercises(bundle)) {
            ExerciseEntity stored = exercises.findById(exercise.id()).orElseThrow();
            assertThat(payloadCodec.fromJson(stored.getType(), stored.getPayload())).isEqualTo(exercise.payload());
        }
    }

    @Test
    void writesNothingWhenTheContentIsUnchanged() {
        ContentBundle bundle = loader.load(ContentFixture.path());
        seeder.seed(bundle);
        List<String> before = snapshot();
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        SeedSummary secondRun = seeder.seed(bundle);

        assertThat(statistics.getEntityInsertCount()).isZero();
        assertThat(statistics.getEntityUpdateCount()).isZero();
        assertThat(secondRun.exercises()).isEqualTo(new Count(10, 0, 0));
        assertThat(snapshot()).isEqualTo(before);
    }

    @Test
    void retiresRemovedContentAndRevivesItWhenItReturns() {
        seeder.seed(loader.load(ContentFixture.path()));
        Path reduced = ContentFixture.copyTo(tempDir);
        editJson(reduced, GREETINGS, unit -> ((ArrayNode) unit.get("exercises")).remove(4));

        SeedSummary withoutWordOrder = seeder.seed(loader.load(reduced));

        assertThat(withoutWordOrder.exercises()).isEqualTo(new Count(9, 0, 1));
        assertThat(retiredExercises()).containsExactly("ex_a1_u01_005");

        seeder.seed(loader.load(ContentFixture.path()));

        assertThat(retiredExercises()).isEmpty();
    }

    @Test
    void neverTouchesExercisesGeneratedForALearner() {
        seeder.seed(loader.load(ContentFixture.path()));
        UUID learner = jdbc.sql("INSERT INTO users (display_name, password_hash) VALUES ('Erza', 'not-a-real-hash') RETURNING id")
                .query(UUID.class).single();
        jdbc.sql("""
                        INSERT INTO exercises (id, pool, type, level, difficulty, skill_tags, prompt_lang, prompt_text, payload,
                                               source, owner_user_id)
                        VALUES ('ai_focus_001', 'lesson', 'translate_free', 'A1.1', 1, ARRAY ['vocab.family'], 'de',
                                'Die Mutter ist zu Hause.', '{"answerLang": "sq", "solutions": ["Nâna âsht në shpi."]}', 'ai', :owner)""")
                .param("owner", learner)
                .update();

        SeedSummary summary = seeder.seed(loader.load(ContentFixture.path()));

        assertThat(summary.exercises()).isEqualTo(new Count(10, 0, 0));
        assertThat(retiredExercises()).isEmpty();
    }

    private List<String> retiredExercises() {
        return jdbc.sql("SELECT id FROM exercises WHERE retired_at IS NOT NULL ORDER BY id").query(String.class).list();
    }

    private List<String> snapshot() {
        return CONTENT_TABLES.stream()
                .map(table -> jdbc.sql("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t::text), '[]')::text FROM " + table + " t")
                        .query(String.class).single())
                .toList();
    }

    private static List<Exercise> allExercises(ContentBundle bundle) {
        return Stream.concat(
                bundle.curriculum().units().stream().flatMap(unit -> unit.exercises().stream()),
                bundle.placementExercises().stream()).toList();
    }
}
