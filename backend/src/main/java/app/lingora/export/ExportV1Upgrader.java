package app.lingora.export;

import static app.lingora.export.DataRows.withField;

import app.lingora.core.srs.SrsSettings;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

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
}
