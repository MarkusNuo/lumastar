package app.lingora.persistence;

import app.lingora.domain.ErrorCategory;
import app.lingora.domain.ErrorCategoryCount;
import app.lingora.domain.ErrorEntry;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SkillTagErrorRate;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Error analysis over the recorded answers (PRD F6), for the lesson composer, the statistics and the profile
 * documents. Two notions are used:
 * <ul>
 *   <li><b>wrong</b>: an answer that does not count as correct; the error rate is the flip side of the accuracy.</li>
 *   <li><b>error</b>: an answer logged with an error category, i.e. wrong and almost correct answers; the Standard
 *       form is a hint only and never an error.</li>
 * </ul>
 * Like the lesson accuracy, only first answers count; retries at the end of a lesson are left out.
 */
@Repository
public class ErrorAnalysisQueries {

    private static final String LOGGED_ERROR = """
            a.error_category IS NOT NULL AND a.error_category <> 'variant.standard_form'""";

    private final JdbcClient jdbc;

    public ErrorAnalysisQueries(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Per skill tag answered since {@code since}, highest error rate first. */
    public List<SkillTagErrorRate> errorRatesBySkillTag(UUID userId, Instant since) {
        return jdbc.sql("""
                        SELECT tag, count(*) AS attempts, count(*) FILTER (WHERE NOT a.is_correct) AS wrong
                        FROM attempts a CROSS JOIN LATERAL unnest(a.skill_tags) AS tag
                        WHERE a.user_id = :user AND NOT a.is_retry AND a.answered_at >= :since
                        GROUP BY tag
                        ORDER BY count(*) FILTER (WHERE NOT a.is_correct)::float8 / count(*) DESC, wrong DESC, tag""")
                .param("user", userId)
                .param("since", SqlTimestamps.of(since))
                .query((row, rowNumber) -> new SkillTagErrorRate(SkillTag.of(row.getString("tag")), row.getInt("attempts"),
                        row.getInt("wrong")))
                .list();
    }

    /**
     * The skill tags with the most wrong answers since {@code since} (PRD F10 "Häufigste Fehler"), each with its error
     * rate and the error category its wrong answers were logged with most often.
     *
     * @param category {@code null} if no wrong answer of the tag has a category
     */
    public record FrequentErrors(SkillTagErrorRate rate, ErrorCategory category) {
    }

    /** Most wrong answers first, then the higher error rate. */
    public List<FrequentErrors> frequentErrorsBySkillTag(UUID userId, Instant since, int limit) {
        return jdbc.sql("""
                        WITH answers AS (
                            SELECT tag, a.is_correct, a.error_category
                            FROM attempts a CROSS JOIN LATERAL unnest(a.skill_tags) AS tag
                            WHERE a.user_id = :user AND NOT a.is_retry AND a.answered_at >= :since
                        ), per_tag AS (
                            SELECT tag, count(*) AS attempts, count(*) FILTER (WHERE NOT is_correct) AS wrong
                            FROM answers GROUP BY tag
                        ), top_category AS (
                            SELECT DISTINCT ON (tag) tag, error_category
                            FROM answers WHERE NOT is_correct AND error_category IS NOT NULL
                            GROUP BY tag, error_category
                            ORDER BY tag, count(*) DESC, error_category
                        )
                        SELECT p.tag, p.attempts, p.wrong, c.error_category
                        FROM per_tag p LEFT JOIN top_category c USING (tag)
                        WHERE p.wrong > 0
                        ORDER BY p.wrong DESC, p.wrong::float8 / p.attempts DESC, p.tag
                        LIMIT :limit""")
                .param("user", userId)
                .param("since", SqlTimestamps.of(since))
                .param("limit", limit)
                .query((row, rowNumber) -> {
                    String category = row.getString("error_category");
                    return new FrequentErrors(new SkillTagErrorRate(SkillTag.of(row.getString("tag")), row.getInt("attempts"),
                            row.getInt("wrong")), category == null ? null : ErrorCategory.fromCode(category));
                })
                .list();
    }

    /** The most frequent error categories since {@code since}. */
    public List<ErrorCategoryCount> topErrorCategories(UUID userId, Instant since, int limit) {
        return jdbc.sql("""
                        SELECT a.error_category, count(*) AS errors
                        FROM attempts a
                        WHERE a.user_id = :user AND NOT a.is_retry AND a.answered_at >= :since AND %s
                        GROUP BY a.error_category
                        ORDER BY errors DESC, a.error_category
                        LIMIT :limit""".formatted(LOGGED_ERROR))
                .param("user", userId)
                .param("since", SqlTimestamps.of(since))
                .param("limit", limit)
                .query((row, rowNumber) -> new ErrorCategoryCount(ErrorCategory.fromCode(row.getString("error_category")),
                        row.getInt("errors")))
                .list();
    }

    /**
     * The latest errors, newest first, as in {@code recent_errors.json}. {@code expected} is the solution shown with
     * the feedback (the first solution of the exercise for answers recorded before it was stored); {@code given} is
     * the answer as text, the wrong matches of match_pairs as "left → right".
     */
    public List<ErrorEntry> recentErrors(UUID userId, int limit) {
        return jdbc.sql("""
                        SELECT a.answered_at, a.exercise_id, a.exercise_type, a.skill_tags, a.error_category, e.prompt_text,
                               coalesce(a.expected, e.payload -> 'solutions' ->> 0) AS expected,
                               coalesce(a.answer ->> 'text', a.answer ->> 'choice',
                                        (SELECT string_agg(t.token, ' ' ORDER BY t.n)
                                         FROM jsonb_array_elements_text(a.answer -> 'tokens') WITH ORDINALITY AS t (token, n)),
                                        (SELECT string_agg((m.match ->> 'left') || ' → ' || (m.match ->> 'right'), ', ' ORDER BY m.n)
                                         FROM jsonb_array_elements(a.answer -> 'wrongMatches') WITH ORDINALITY AS m (match, n))
                                       ) AS given,
                               (a.answer ->> 'mistakes')::integer AS mistakes
                        FROM attempts a JOIN exercises e ON e.id = a.exercise_id
                        WHERE a.user_id = :user AND NOT a.is_retry AND %s
                        ORDER BY a.answered_at DESC, a.position DESC
                        LIMIT :limit""".formatted(LOGGED_ERROR))
                .param("user", userId)
                .param("limit", limit)
                .query(ErrorAnalysisQueries::errorEntry)
                .list();
    }

    private static ErrorEntry errorEntry(ResultSet row, int rowNumber) throws SQLException {
        List<SkillTag> skillTags = Arrays.stream((String[]) row.getArray("skill_tags").getArray()).map(SkillTag::of).toList();
        String given = row.getString("given");
        int mistakes = row.getInt("mistakes");
        if (given == null && !row.wasNull()) {
            given = mistakes == 1 ? "1 Paar falsch zugeordnet" : mistakes + " Paare falsch zugeordnet";
        }
        return new ErrorEntry(SqlTimestamps.instant(row, "answered_at"), row.getString("exercise_id"),
                ExerciseType.fromCode(row.getString("exercise_type")), skillTags,
                ErrorCategory.fromCode(row.getString("error_category")), row.getString("prompt_text"),
                row.getString("expected"), given);
    }
}
