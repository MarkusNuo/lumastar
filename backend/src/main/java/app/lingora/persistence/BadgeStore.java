package app.lingora.persistence;

import app.lingora.domain.Coded;
import app.lingora.domain.LevelBadge;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Table {@code badges}: the level badges of the learner (PRD F9), each awarded once by a checkpoint. */
@Repository
public class BadgeStore {

    private final JdbcClient jdbc;

    public BadgeStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record AwardedBadge(LevelBadge badge, Instant awardedAt) {
    }

    /** Awards the badge unless the learner has it already; returns whether it is new. */
    public boolean award(UUID userId, LevelBadge badge, UUID checkpointSessionId, Instant at) {
        return jdbc.sql("""
                        INSERT INTO badges (user_id, code, session_id, awarded_at) VALUES (:user, :code, :session, :at)
                        ON CONFLICT (user_id, code) DO NOTHING""")
                .param("user", userId)
                .param("code", badge.code())
                .param("session", checkpointSessionId)
                .param("at", SqlTimestamps.of(at))
                .update() == 1;
    }

    /** In band order. */
    public List<AwardedBadge> badges(UUID userId) {
        return jdbc.sql("SELECT code, awarded_at FROM badges WHERE user_id = :user")
                .param("user", userId)
                .query((row, rowNumber) -> new AwardedBadge(Coded.fromCode(LevelBadge.class, row.getString("code")),
                        SqlTimestamps.instant(row, "awarded_at")))
                .stream()
                .sorted(Comparator.comparing(AwardedBadge::badge))
                .toList();
    }

    /** The badges a checkpoint session of the learner awarded, in band order. */
    public List<LevelBadge> awardedBy(UUID userId, UUID sessionId) {
        return jdbc.sql("SELECT code FROM badges WHERE user_id = :user AND session_id = :session")
                .param("user", userId)
                .param("session", sessionId)
                .query((row, rowNumber) -> Coded.fromCode(LevelBadge.class, row.getString("code")))
                .stream()
                .sorted()
                .toList();
    }
}
