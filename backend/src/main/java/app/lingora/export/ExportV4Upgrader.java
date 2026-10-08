package app.lingora.export;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * Format 4 → 5 (streak goal, M10): the learner's streak goal ({@code data/streak_goals.json}). There was none before,
 * so the learner starts with the first goal of 10 days.
 */
@Component
class ExportV4Upgrader implements BackupUpgrader {

    @Override
    public int fromVersion() {
        return 4;
    }

    @Override
    public Map<String, JsonNode> upgrade(Map<String, JsonNode> dataFiles) {
        Map<String, JsonNode> upgraded = new LinkedHashMap<>(dataFiles);
        upgraded.putIfAbsent(ExportFormat.DATA + "streak_goals.json", DocumentJson.MAPPER.createArrayNode());
        return upgraded;
    }
}
