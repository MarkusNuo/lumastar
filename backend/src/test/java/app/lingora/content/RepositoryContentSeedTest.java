package app.lingora.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.core.evaluation.AnswerEvaluator;
import app.lingora.domain.Answer;
import app.lingora.domain.AnswerLang;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload;
import app.lingora.domain.ExerciseSource;
import app.lingora.domain.Level;
import app.lingora.domain.Outcome;
import app.lingora.domain.Prompt;
import app.lingora.domain.SkillTag;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Content changes in the repository's {@code /content} that the importer cannot read fail the backend build. */
class RepositoryContentSeedTest extends IntegrationTest {

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    @Autowired
    private ContentProperties properties;

    @Autowired
    private AnswerEvaluator evaluator;

    @BeforeEach
    void startWithoutContent() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
    }

    @Test
    void importsTheRepositoryContent() {
        SeedSummary summary = seeder.seed(loader.load(properties.directory()));

        assertThat(List.of(summary.skillTags(), summary.stages(), summary.units(), summary.items(), summary.exercises()))
                .allSatisfy(count -> assertThat(count.total()).isPositive());
        assertThat(count("SELECT count(*) FROM content_units WHERE has_content")).isPositive();
        assertThat(count("SELECT count(*) FROM exercises WHERE pool = 'lesson'")).isPositive();
        assertThat(count("SELECT count(*) FROM exercises WHERE pool = 'placement'")).isPositive();
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

    private int count(String sql) {
        return jdbc.sql(sql).query(Integer.class).single();
    }
}
