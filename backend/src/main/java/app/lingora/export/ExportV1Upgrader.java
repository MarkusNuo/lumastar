package app.lingora.export;

import app.lingora.core.srs.SrsSettings;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Consumer;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Format 1 → 2 (adaptivity, M4): level badges ({@code data/badges.json}, none before), the result of a checkpoint
 * ({@code sessions.checkpointPassed}, no checkpoints before) and the target retention of a review
 * ({@code reviewLog.requestRetention}, the default 0.90 before it was configurable).
 */
@Component
class ExportV1Upgrader implements BackupUpgrader {

    @Override
    public int fromVersion() {
        return 1;
    }

    @Override
    public Map<String, JsonNode> upgrade(Map<String, JsonNode> dataFiles) {
        Map<String, JsonNode> upgraded = new LinkedHashMap<>(dataFiles);
        upgraded.computeIfPresent(ExportFormat.DATA + "sessions.json",
                (file, sessions) -> withField(sessions, row -> row.putNull("checkpointPassed")));
        upgraded.computeIfPresent(ExportFormat.DATA + "review_log.json",
                (file, reviews) -> withField(reviews, row -> row.put("requestRetention", BigDecimal.valueOf(SrsSettings.DEFAULT_REQUEST_RETENTION))));
        upgraded.putIfAbsent(ExportFormat.DATA + "badges.json", DocumentJson.MAPPER.createArrayNode());
        return upgraded;
    }

    /** A copy of the rows with the field added to each; anything but an array of objects is left to the validator. */
    private static JsonNode withField(JsonNode rows, Consumer<ObjectNode> addField) {
        if (!(rows instanceof ArrayNode array)) {
            return rows;
        }
        ArrayNode copy = array.deepCopy();
        copy.forEach(row -> {
            if (row instanceof ObjectNode object) {
                addField.accept(object);
            }
        });
        return copy;
    }
}
