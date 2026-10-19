package app.lumastar.persistence;

import app.lumastar.domain.Level;
import app.lumastar.domain.SkillTag;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Completed lessons of a learner, from which the learning path derives its progress (PRD 12.3). */
@Repository
public class LessonProgressQueries {

    private final JdbcClient jdbc;

    public LessonProgressQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** A completed focus lesson: the weak skill tags it practised and when it started. */
    public record FocusLesson(List<SkillTag> skillTags, Instant startedAt) {

        public FocusLesson {
            skillTags = List.copyOf(skillTags);
        }
    }

    /** Completed unit lessons per unit id. */
    public Map<String, Integer> completedLessonsByUnit(UUID userId) {
        return jdbc.sql("""
                        SELECT unit_id, count(*) AS lessons FROM sessions
                        WHERE user_id = :user AND kind = 'lesson' AND finished_at IS NOT NULL AND unit_id IS NOT NULL
                        GROUP BY unit_id""")
                .param("user", userId)
                .query((row, rowNumber) -> Map.entry(row.getString("unit_id"), row.getInt("lessons")))
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    /** The days, in the learner's time zone, on which the learner completed a lesson of any kind since {@code since}. */
    public int learningDaysSince(UUID userId, Instant since, ZoneId zone) {
        return jdbc.sql("""
                        SELECT count(DISTINCT (finished_at AT TIME ZONE :zone)::date) FROM sessions
                        WHERE user_id = :user AND finished_at >= :since""")
                .param("user", userId)
                .param("since", SqlTimestamps.of(since))
                .param("zone", zone.getId())
                .query(Integer.class)
                .single();
    }

    /** Per skill tag, the number of lessons with first answers to it. */
    public Map<SkillTag, Integer> lessonsPerSkillTag(UUID userId) {
        return jdbc.sql("""
                        SELECT tag, count(DISTINCT a.session_id) AS lessons
                        FROM attempts a CROSS JOIN LATERAL unnest(a.skill_tags) AS tag
                        WHERE a.user_id = :user AND NOT a.is_retry
                        GROUP BY tag""")
                .param("user", userId)
                .query((row, rowNumber) -> Map.entry(SkillTag.of(row.getString("tag")), row.getInt("lessons")))
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    /** A passed checkpoint: its stage, when it was finished and the share of correct first answers. */
    public record PassedCheckpoint(Level level, Instant passedAt, double accuracy) {
    }

    /** The checkpoint the learner passed last among the stages below {@code level}. */
    public Optional<PassedCheckpoint> lastPassedCheckpointBelow(UUID userId, Level level) {
        String[] below = Arrays.stream(Level.values()).filter(level::isAbove).map(Level::code).toArray(String[]::new);
        return jdbc.sql("""
                        SELECT level, finished_at, accuracy FROM sessions
                        WHERE user_id = :user AND kind = 'checkpoint' AND checkpoint_passed AND level = ANY (:levels)
                        ORDER BY finished_at DESC
                        LIMIT 1""")
                .param("user", userId)
                .param("levels", below)
                .query((row, rowNumber) -> new PassedCheckpoint(Level.fromCode(row.getString("level")),
                        SqlTimestamps.instant(row, "finished_at"), row.getDouble("accuracy")))
                .optional();
    }

    /** The stages whose checkpoint the learner has passed. */
    public Set<Level> passedCheckpoints(UUID userId) {
        return jdbc.sql("SELECT DISTINCT level FROM sessions WHERE user_id = :user AND kind = 'checkpoint' AND checkpoint_passed")
                .param("user", userId)
                .query((row, rowNumber) -> Level.fromCode(row.getString("level")))
                .stream()
                .collect(Collectors.toSet());
    }

    /** The exercises the learner has answered at least once, retries aside. */
    public Set<String> practisedExercises(UUID userId) {
        return Set.copyOf(jdbc.sql("SELECT DISTINCT exercise_id FROM attempts WHERE user_id = :user AND NOT is_retry")
                .param("user", userId)
                .query(String.class)
                .list());
    }

    /** The accuracy of the last completed lessons of the unit, newest first. */
    public List<Double> recentAccuracies(UUID userId, String unitId, int lessons) {
        return jdbc.sql("""
                        SELECT accuracy FROM sessions
                        WHERE user_id = :user AND kind = 'lesson' AND unit_id = :unit AND finished_at IS NOT NULL
                        ORDER BY finished_at DESC
                        LIMIT :lessons""")
                .param("user", userId)
                .param("unit", unitId)
                .param("lessons", lessons)
                .query(Double.class)
                .list();
    }

    public List<FocusLesson> completedFocusLessons(UUID userId) {
        return jdbc.sql("""
                        SELECT focus_skill_tags, started_at FROM sessions
                        WHERE user_id = :user AND kind = 'focus' AND finished_at IS NOT NULL""")
                .param("user", userId)
                .query((row, rowNumber) -> new FocusLesson(
                        Arrays.stream((String[]) row.getArray("focus_skill_tags").getArray()).map(SkillTag::of).toList(),
                        SqlTimestamps.instant(row, "started_at")))
                .list();
    }
}
