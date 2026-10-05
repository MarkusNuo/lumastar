package app.lingora.persistence;

import app.lingora.domain.SkillTag;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
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
