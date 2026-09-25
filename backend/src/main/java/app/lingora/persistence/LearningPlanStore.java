package app.lingora.persistence;

import app.lingora.domain.Coded;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.PlanChange;
import app.lingora.domain.PlanChangeKind;
import app.lingora.domain.PlanTrigger;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/**
 * Tables {@code learning_plans} and {@code plan_changes}: every plan version as the {@code learning_plan.json}
 * document of PRD 8.3 and the history of its changes with their German reasons (PRD F3).
 */
@Repository
public class LearningPlanStore {

    private final JdbcClient jdbc;
    private final JsonMapper json;

    public LearningPlanStore(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public record StoredPlan(UUID id, int version, Instant validFrom, LearningPlan plan) {
    }

    public record LoggedChange(Instant changedAt, int planVersion, PlanTrigger trigger, PlanChangeKind kind, String reason) {
    }

    /** The newest plan version of the learner. */
    @Transactional(readOnly = true)
    public Optional<StoredPlan> current(UUID userId) {
        return jdbc.sql("""
                        SELECT id, version, valid_from, plan::text AS plan FROM learning_plans
                        WHERE user_id = :user ORDER BY version DESC LIMIT 1""")
                .param("user", userId)
                .query((row, rowNumber) -> new StoredPlan(row.getObject("id", UUID.class), row.getInt("version"),
                        SqlTimestamps.instant(row, "valid_from"), json.readValue(row.getString("plan"), LearningPlan.class)))
                .optional();
    }

    /** Stores {@code plan} as the next version, valid from {@code validFrom}. */
    @Transactional
    public StoredPlan save(UUID userId, LearningPlan plan, Instant validFrom) {
        int version = jdbc.sql("SELECT coalesce(max(version), 0) + 1 FROM learning_plans WHERE user_id = :user")
                .param("user", userId)
                .query(Integer.class)
                .single();
        UUID id = jdbc.sql("""
                        INSERT INTO learning_plans (user_id, version, generated_by, plan, valid_from)
                        VALUES (:user, :version, :generatedBy, :plan::jsonb, :validFrom)
                        RETURNING id""")
                .param("user", userId)
                .param("version", version)
                .param("generatedBy", plan.generatedBy())
                .param("plan", json.writeValueAsString(plan))
                .param("validFrom", SqlTimestamps.of(validFrom))
                .query(UUID.class)
                .single();
        return new StoredPlan(id, version, validFrom, plan);
    }

    /**
     * Logs the changes of one plan version in their order; each is stamped one microsecond after the previous one,
     * so that the history keeps that order.
     */
    @Transactional
    public void logChanges(UUID userId, UUID planId, PlanTrigger trigger, List<PlanChange> changes, Instant at) {
        Instant first = at.truncatedTo(ChronoUnit.MICROS);
        for (int i = 0; i < changes.size(); i++) {
            PlanChange change = changes.get(i);
            jdbc.sql("""
                            INSERT INTO plan_changes (user_id, plan_id, triggered_by, kind, reason, details, created_at)
                            VALUES (:user, :plan, :trigger, :kind, :reason, :details::jsonb, :at)""")
                    .param("user", userId)
                    .param("plan", planId)
                    .param("trigger", trigger.code())
                    .param("kind", change.kind().code())
                    .param("reason", change.reason())
                    .param("details", json.writeValueAsString(change.details()))
                    .param("at", SqlTimestamps.of(first.plus(i, ChronoUnit.MICROS)))
                    .update();
        }
    }

    /** The plan history, newest plan version first and the changes of one version in the order they were made. */
    @Transactional(readOnly = true)
    public List<LoggedChange> changes(UUID userId) {
        return jdbc.sql("""
                        SELECT c.created_at, p.version, c.triggered_by, c.kind, c.reason
                        FROM plan_changes c JOIN learning_plans p ON p.id = c.plan_id
                        WHERE c.user_id = :user
                        ORDER BY p.version DESC, c.created_at""")
                .param("user", userId)
                .query((row, rowNumber) -> new LoggedChange(SqlTimestamps.instant(row, "created_at"), row.getInt("version"),
                        Coded.fromCode(PlanTrigger.class, row.getString("triggered_by")),
                        Coded.fromCode(PlanChangeKind.class, row.getString("kind")), row.getString("reason")))
                .list();
    }

    /** When each focus unit was last inserted into the learner's plan, by unit id. */
    @Transactional(readOnly = true)
    public Map<String, Instant> focusInsertions(UUID userId) {
        return jdbc.sql("""
                        SELECT details ->> 'unitId' AS unit_id, max(created_at) AS inserted_at FROM plan_changes
                        WHERE user_id = :user AND kind = 'focus_inserted' AND details ->> 'unitId' IS NOT NULL
                        GROUP BY details ->> 'unitId'""")
                .param("user", userId)
                .query((row, rowNumber) -> Map.entry(row.getString("unit_id"), SqlTimestamps.instant(row, "inserted_at")))
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }
}
