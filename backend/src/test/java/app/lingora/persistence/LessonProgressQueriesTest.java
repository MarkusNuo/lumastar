package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
import app.lingora.content.ContentFixture;
import app.lingora.content.ContentLoader;
import app.lingora.content.ContentSeeder;
import app.lingora.domain.Level;
import app.lingora.persistence.LessonProgressQueries.PassedCheckpoint;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class LessonProgressQueriesTest extends IntegrationTest {

    private static final String GREETINGS = "a1_u01_greetings";
    private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    @Autowired
    private LessonProgressQueries progress;

    private UUID learner;

    @BeforeEach
    void learnerWithSeededFixture() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(loader.load(ContentFixture.path()));
        learner = new LearnerFixture(jdbc).learner("Erza");
    }

    @Test
    void onlyFinishedUnitLessonsSteerTheDifficultyWindow() {
        finished("lesson", 0.95, 3);
        finished("lesson", 0.92, 2);
        for (String kind : new String[] {"focus", "practice", "review", "checkpoint"}) {
            finished(kind, 0.1, 1);
        }
        jdbc.sql("""
                        INSERT INTO sessions (user_id, kind, unit_id, level, composed_by, started_at)
                        VALUES (:user, 'lesson', :unit, 'A1.1', 'rule_based_v1', :at)""")
                .param("user", learner)
                .param("unit", GREETINGS)
                .param("at", SqlTimestamps.of(NOW))
                .update();

        assertThat(progress.recentAccuracies(learner, GREETINGS, 2)).containsExactly(0.92, 0.95);
    }

    @Test
    void theCheckpointPassedLastBelowTheLevelIsTheMostRecentPassOfAStageBelowIt() {
        checkpoint("A1.1", true, 0.9, 5);
        checkpoint("A0", true, 0.8, 3);
        checkpoint("A1.2", false, 0.5, 2);
        checkpoint("A1.3", true, 1.0, 1);

        assertThat(progress.lastPassedCheckpointBelow(learner, Level.A1_3)).hasValueSatisfying(passed -> {
            assertThat(passed.level()).isEqualTo(Level.A0);
            assertThat(passed.accuracy()).isEqualTo(0.8);
            assertThat(passed.passedAt()).isEqualTo(NOW.minus(Duration.ofDays(3)));
        });
        assertThat(progress.lastPassedCheckpointBelow(learner, Level.A1_1)).map(PassedCheckpoint::level).contains(Level.A0);
        assertThat(progress.lastPassedCheckpointBelow(learner, Level.A0)).isEmpty();
    }

    private void checkpoint(String level, boolean passed, double accuracy, int daysAgo) {
        Instant at = NOW.minus(Duration.ofDays(daysAgo));
        jdbc.sql("""
                        INSERT INTO sessions (user_id, kind, level, composed_by, started_at, finished_at, exercise_count,
                                              correct_count, accuracy, checkpoint_passed)
                        VALUES (:user, 'checkpoint', :level, 'rule_based_v1', :at, :at, 10, :correct, :accuracy, :passed)""")
                .param("user", learner)
                .param("level", level)
                .param("at", SqlTimestamps.of(at))
                .param("correct", (int) Math.round(accuracy * 10))
                .param("accuracy", accuracy)
                .param("passed", passed)
                .update();
    }

    /** A session of the unit finished {@code daysAgo} days ago with ten exercises at the accuracy. */
    private void finished(String kind, double accuracy, int daysAgo) {
        Instant at = NOW.minus(Duration.ofDays(daysAgo));
        jdbc.sql("""
                        INSERT INTO sessions (user_id, kind, unit_id, level, composed_by, started_at, finished_at,
                                              exercise_count, correct_count, accuracy, checkpoint_passed)
                        VALUES (:user, :kind, :unit, 'A1.1', 'rule_based_v1', :at, :at, 10, :correct, :accuracy,
                                CASE WHEN :kind = 'checkpoint' THEN false END)""")
                .param("user", learner)
                .param("kind", kind)
                .param("unit", GREETINGS)
                .param("at", SqlTimestamps.of(at))
                .param("correct", (int) Math.round(accuracy * 10))
                .param("accuracy", accuracy)
                .update();
    }
}
