package app.lingora.persistence;

import app.lingora.domain.SkillTag;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
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
