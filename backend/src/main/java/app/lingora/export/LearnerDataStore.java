package app.lingora.export;

import app.lingora.export.BackupDataValidator.ValidBackup;
import app.lingora.export.BackupRejectedException.Issue;
import app.lingora.export.LearnerTable.ContentKind;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Reads and replaces all learner data of one account as JSON, table by table. PostgreSQL converts between rows and
 * JSON ({@code json_build_object}, {@code json_populate_recordset}), so every column type passes through unchanged.
 * Table and column names come from {@link LearnerTables} only.
 */
@Repository
class LearnerDataStore {

    private final JdbcClient jdbc;

    LearnerDataStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Timestamps in the exported JSON are written in UTC, whatever the server's time zone; for this transaction only. */
    void writeTimestampsInUtc() {
        jdbc.sql("SET LOCAL TIME ZONE 'UTC'").update();
    }

    ObjectNode profile(UUID userId) {
        return (ObjectNode) DocumentJson.read(jdbc.sql("SELECT %s::text FROM users WHERE id = :user"
                        .formatted(jsonObject(LearnerTables.PROFILE_COLUMNS)))
                .param("user", userId)
                .query(String.class)
                .single());
    }

    ArrayNode rows(UUID userId, LearnerTable table) {
        return (ArrayNode) DocumentJson.read(jdbc.sql("SELECT coalesce(json_agg(%s ORDER BY %s), '[]')::text FROM %s WHERE user_id = :user"
                        .formatted(jsonObject(table.columns()), table.orderBy(), table.name()))
                .param("user", userId)
                .query(String.class)
                .single());
    }

    /** Replaces the profile and all rows of the learner; the account (id, password hash) stays. Returns rows per table. */
    Map<String, Integer> replace(UUID userId, ValidBackup backup) {
        jdbc.sql("SELECT id FROM users WHERE id = :user FOR UPDATE").param("user", userId).query(UUID.class).single();
        LearnerTables.ALL.reversed().forEach(table ->
                jdbc.sql("DELETE FROM %s WHERE user_id = :user".formatted(table.name())).param("user", userId).update());
        importing(ExportFormat.PROFILE_DATA, () -> jdbc.sql("""
                        UPDATE users SET (%1$s) = (SELECT %1$s FROM json_populate_record(NULL::users, :profile::json))
                        WHERE id = :user""".formatted(String.join(", ", LearnerTables.PROFILE_COLUMNS)))
                .param("profile", withColumnNames(backup.profile(), LearnerTables.PROFILE_COLUMNS).toString())
                .param("user", userId)
                .update());
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (LearnerTable table : LearnerTables.ALL) {
            counts.put(table.name(), importing(table.file(), () -> insert(userId, table, backup.rows().get(table))));
        }
        LearnerTables.ALL.forEach(table -> requireOwnParents(userId, table));
        return counts;
    }

    /** The ids of {@code ids} that do not exist as content of the given kind; retired content exists. */
    Set<String> missing(ContentKind kind, Collection<String> ids) {
        Set<String> existing = Set.copyOf(jdbc.sql("SELECT id FROM %s WHERE id = ANY (:ids)".formatted(kind.table()))
                .param("ids", ids.toArray(String[]::new))
                .query(String.class)
                .list());
        return ids.stream().filter(id -> !existing.contains(id)).collect(Collectors.toSet());
    }

    private int insert(UUID userId, LearnerTable table, ArrayNode rows) {
        ArrayNode rowsWithColumnNames = DocumentJson.MAPPER.createArrayNode();
        rows.forEach(row -> rowsWithColumnNames.add(withColumnNames((ObjectNode) row, table.columns())));
        String columns = String.join(", ", table.columns());
        return jdbc.sql("""
                        INSERT INTO %1$s (user_id, %2$s)
                        SELECT :user, %2$s FROM json_populate_recordset(NULL::%1$s, :rows::json)"""
                        .formatted(table.name(), columns))
                .param("user", userId)
                .param("rows", rowsWithColumnNames.toString())
                .update();
    }

    /** Foreign keys only prove that a parent row exists; it must also belong to the importing learner. */
    private void requireOwnParents(UUID userId, LearnerTable table) {
        table.ownedParents().forEach((column, parent) -> {
            int foreign = jdbc.sql("""
                            SELECT count(*) FROM %s c JOIN %s p ON p.id = c.%s
                            WHERE c.user_id = :user AND p.user_id <> :user""".formatted(table.name(), parent, column))
                    .param("user", userId)
                    .query(Integer.class)
                    .single();
            if (foreign > 0) {
                throw BackupRejectedException.invalidData(List.of(new Issue(table.file(),
                        "%d rows refer to %s of another learner (%s)".formatted(foreign, parent, LearnerTable.key(column)))));
            }
        });
    }

    private static <T> T importing(String file, Supplier<T> statement) {
        try {
            return statement.get();
        } catch (DataAccessException e) {
            String cause = String.valueOf(NestedExceptionUtils.getMostSpecificCause(e).getMessage());
            throw BackupRejectedException.invalidData(List.of(new Issue(file, cause.lines().findFirst().orElse(cause))));
        }
    }

    private static ObjectNode withColumnNames(ObjectNode row, List<String> columns) {
        ObjectNode renamed = DocumentJson.MAPPER.createObjectNode();
        columns.forEach(column -> renamed.set(column, row.get(LearnerTable.key(column))));
        return renamed;
    }

    /** {@code json_build_object('id', id, 'sessionId', session_id, …)} */
    private static String jsonObject(List<String> columns) {
        return columns.stream()
                .map(column -> "'%s', %s".formatted(LearnerTable.key(column), column))
                .collect(Collectors.joining(", ", "json_build_object(", ")"));
    }
}
