package app.lingora.export;

import static app.lingora.export.DataRows.withField;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * Format 3 → 4: the placement test whose completion met the daily goal of a streak day
 * ({@code streakDays.placementTestId}). It was not recorded before, so a day met by a placement test has none.
 */
@Component
class ExportV3Upgrader implements BackupUpgrader {

    @Override
    public int fromVersion() {
        return 3;
    }

    @Override
    public Map<String, JsonNode> upgrade(Map<String, JsonNode> dataFiles) {
        Map<String, JsonNode> upgraded = new LinkedHashMap<>(dataFiles);
        upgraded.computeIfPresent(ExportFormat.DATA + "streak_days.json",
                (file, days) -> withField(days, row -> row.putNull("placementTestId")));
        return upgraded;
    }
}
