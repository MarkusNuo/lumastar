package app.lingora.export;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * Format 2 → 3 (streak and daily goal, M5): the days that counted for the streak ({@code data/streak_days.json}). They
 * were not recorded before; the streak itself is in {@code data/streaks.json} already.
 */
@Component
class ExportV2Upgrader implements BackupUpgrader {

    @Override
    public int fromVersion() {
        return 2;
    }

    @Override
    public Map<String, JsonNode> upgrade(Map<String, JsonNode> dataFiles) {
        Map<String, JsonNode> upgraded = new LinkedHashMap<>(dataFiles);
        upgraded.putIfAbsent(ExportFormat.DATA + "streak_days.json", DocumentJson.MAPPER.createArrayNode());
        return upgraded;
    }
}
