package app.lumastar.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class ExportV3UpgraderTest {

    private final ExportV3Upgrader upgrader = new ExportV3Upgrader();

    @Test
    void addsNoPlacementTestToTheStreakDaysAndKeepsEveryOtherFile() {
        Map<String, JsonNode> upgraded = upgrader.upgrade(Map.of(
                "data/streak_days.json", DocumentJson.read("""
                        [{"id": "d1", "kind": "goal_met", "sessionId": "s1"},
                         {"id": "d2", "kind": "freeze", "sessionId": null}]"""),
                "data/sessions.json", DocumentJson.read("[]")));

        assertThat(upgraded.get("data/streak_days.json")).isEqualTo(DocumentJson.read("""
                [{"id": "d1", "kind": "goal_met", "sessionId": "s1", "placementTestId": null},
                 {"id": "d2", "kind": "freeze", "sessionId": null, "placementTestId": null}]"""));
        assertThat(upgraded.get("data/sessions.json")).isEqualTo(DocumentJson.read("[]"));
    }

    @Test
    void leavesMalformedFilesToTheValidator() {
        Map<String, JsonNode> upgraded = upgrader.upgrade(Map.of("data/streak_days.json", DocumentJson.read("{}")));

        assertThat(upgraded.get("data/streak_days.json")).isEqualTo(DocumentJson.read("{}"));
    }

    @Test
    void readsVersion3() {
        assertThat(upgrader.fromVersion()).isEqualTo(3);
    }
}
