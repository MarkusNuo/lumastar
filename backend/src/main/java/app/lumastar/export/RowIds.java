package app.lumastar.export;

import app.lumastar.export.BackupDataValidator.ValidBackup;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.StreamSupport;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * The row ids of a backup. Restoring one's own export keeps them; an export of another account on this instance
 * (whose rows still exist) gets new ids, derived from the importing account and the old id, with every reference
 * between the rows following along.
 */
final class RowIds {

    private static final Pattern UUID_FORMAT =
            Pattern.compile("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    private static final String ID = "id";

    private RowIds() {
    }

    /** The well-formed ids of the rows; the database rejects the others on insert. */
    static List<String> of(ArrayNode rows) {
        return StreamSupport.stream(rows.spliterator(), false)
                .map(row -> row.get(ID))
                .filter(id -> id != null && id.isString() && UUID_FORMAT.matcher(id.asString()).matches())
                .map(JsonNode::asString)
                .toList();
    }

    static ValidBackup reassigned(UUID importingAccount, ValidBackup backup) {
        Map<String, String> newIds = new HashMap<>();
        backup.rows().values().forEach(rows -> of(rows).forEach(id -> newIds.put(id, newId(importingAccount, id))));
        Map<LearnerTable, ArrayNode> rows = new LinkedHashMap<>();
        backup.rows().forEach((table, tableRows) -> {
            ArrayNode copy = tableRows.deepCopy();
            copy.forEach(row -> {
                replace((ObjectNode) row, ID, newIds);
                table.ownedParents().keySet().forEach(column -> replace((ObjectNode) row, LearnerTable.key(column), newIds));
            });
            rows.put(table, copy);
        });
        return new ValidBackup(backup.profile(), rows);
    }

    private static void replace(ObjectNode row, String key, Map<String, String> newIds) {
        JsonNode value = row.get(key);
        if (value != null && value.isString() && newIds.containsKey(value.asString())) {
            row.put(key, newIds.get(value.asString()));
        }
    }

    private static String newId(UUID importingAccount, String oldId) {
        return UUID.nameUUIDFromBytes((importingAccount + "/" + oldId).getBytes(StandardCharsets.UTF_8)).toString();
    }
}
