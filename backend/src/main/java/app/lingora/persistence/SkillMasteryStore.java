package app.lingora.persistence;

import app.lingora.core.mastery.MasteryCalculator;
import app.lingora.domain.Outcome;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillMastery.Entry;
import app.lingora.domain.SkillTag;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** Table {@code skill_mastery}: the raw mastery per skill tag; decay is applied on read by {@link MasteryCalculator}. */
@Repository
public class SkillMasteryStore {

    private final JdbcClient jdbc;
    private final MasteryCalculator calculator;

    public SkillMasteryStore(JdbcClient jdbc, MasteryCalculator calculator) {
        this.jdbc = jdbc;
        this.calculator = calculator;
    }

    /**
     * Applies an answer to every skill tag of the exercise. Missing rows are created in the unpractised state first,
     * so that the rows can be locked and concurrent answers to the same tag never overwrite each other.
     */
    @Transactional
    public void recordAnswer(UUID userId, Collection<SkillTag> tags, Outcome outcome, boolean retry, Instant answeredAt) {
        String[] tagIds = tags.stream().map(SkillTag::id).sorted().distinct().toArray(String[]::new);
        jdbc.sql("""
                        INSERT INTO skill_mastery (user_id, skill_tag, mastery, updated_at)
                        SELECT :user, tag, :mastery, :now FROM unnest(:tags) AS tag
                        ON CONFLICT (user_id, skill_tag) DO NOTHING""")
                .param("user", userId)
                .param("mastery", MasteryCalculator.UNPRACTISED.mastery())
                .param("tags", tagIds)
                .param("now", SqlTimestamps.of(answeredAt))
                .update();
        Map<SkillTag, Entry> current = jdbc.sql("""
                        SELECT skill_tag, mastery, attempts, correct, last_practiced_at FROM skill_mastery
                        WHERE user_id = :user AND skill_tag = ANY (:tags)
                        ORDER BY skill_tag
                        FOR UPDATE""")
                .param("user", userId)
                .param("tags", tagIds)
                .query(SkillMasteryStore::row)
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        current.forEach((tag, entry) -> save(userId, tag, calculator.update(entry, outcome, retry, answeredAt), answeredAt));
    }

    /**
     * Sets initial estimates, e.g. from the placement test. An estimate only ever raises the value of a tag, so a
     * re-placement cannot lower it; tags that have been practised keep their value, since their answers say more than
     * an estimate.
     */
    @Transactional
    public void seedInitial(UUID userId, Map<SkillTag, Double> estimates, Instant at) {
        estimates.forEach((tag, estimate) -> jdbc.sql("""
                        INSERT INTO skill_mastery (user_id, skill_tag, mastery, updated_at)
                        VALUES (:user, :tag, :mastery, :now)
                        ON CONFLICT (user_id, skill_tag) DO UPDATE SET mastery = excluded.mastery, updated_at = excluded.updated_at
                        WHERE skill_mastery.attempts = 0 AND skill_mastery.mastery < excluded.mastery""")
                .param("user", userId)
                .param("tag", tag.id())
                .param("mastery", calculator.initial(estimate).mastery())
                .param("now", SqlTimestamps.of(at))
                .update());
    }

    /** The stored values without decay. */
    @Transactional(readOnly = true)
    public SkillMastery raw(UUID userId) {
        return new SkillMastery(jdbc.sql("""
                        SELECT skill_tag, mastery, attempts, correct, last_practiced_at FROM skill_mastery
                        WHERE user_id = :user""")
                .param("user", userId)
                .query(SkillMasteryStore::row)
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)));
    }

    /** The mastery as it stands at {@code now}, i.e. decayed since the last practice. */
    @Transactional(readOnly = true)
    public SkillMastery effective(UUID userId, Instant now) {
        return calculator.effective(raw(userId), now);
    }

    private void save(UUID userId, SkillTag tag, Entry entry, Instant updatedAt) {
        jdbc.sql("""
                        UPDATE skill_mastery
                        SET mastery = :mastery, attempts = :attempts, correct = :correct, last_practiced_at = :lastPracticed,
                            updated_at = :now
                        WHERE user_id = :user AND skill_tag = :tag""")
                .param("mastery", entry.mastery())
                .param("attempts", entry.attempts())
                .param("correct", entry.correct())
                .param("lastPracticed", SqlTimestamps.of(entry.lastPracticed()))
                .param("now", SqlTimestamps.of(updatedAt))
                .param("user", userId)
                .param("tag", tag.id())
                .update();
    }

    private static Map.Entry<SkillTag, Entry> row(ResultSet row, int rowNumber) throws SQLException {
        return Map.entry(SkillTag.of(row.getString("skill_tag")), new Entry(row.getDouble("mastery"), row.getInt("attempts"),
                row.getInt("correct"), SqlTimestamps.instant(row, "last_practiced_at")));
    }
}
