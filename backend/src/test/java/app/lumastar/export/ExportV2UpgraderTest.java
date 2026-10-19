package app.lumastar.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class ExportV2UpgraderTest {

    private final ExportV2Upgrader upgrader = new ExportV2Upgrader();

    @Test
    void addsNoStreakDaysAndKeepsEveryOtherFile() {
        Map<String, JsonNode> upgraded = upgrader.upgrade(Map.of(
                "data/streaks.json", DocumentJson.read("""
                        [{"id": "s1", "currentDays": 4, "longestDays": 9}]"""),
                "data/sessions.json", DocumentJson.read("[]")));

        assertThat(upgraded.get("data/streak_days.json")).isEqualTo(DocumentJson.read("[]"));
        assertThat(upgraded.get("data/streaks.json")).isEqualTo(DocumentJson.read("""
                [{"id": "s1", "currentDays": 4, "longestDays": 9}]"""));
        assertThat(upgraded.get("data/sessions.json")).isEqualTo(DocumentJson.read("[]"));
    }

    @Test
    void readsVersion2() {
        assertThat(upgrader.fromVersion()).isEqualTo(2);
    }
}
