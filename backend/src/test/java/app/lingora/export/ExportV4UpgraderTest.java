package app.lingora.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class ExportV4UpgraderTest {

    private final ExportV4Upgrader upgrader = new ExportV4Upgrader();

    @Test
    void addsNoStreakGoalSoThatTheLearnerStartsWithTheFirstOneAndKeepsEveryOtherFile() {
        Map<String, JsonNode> upgraded = upgrader.upgrade(Map.of(
                "data/streaks.json", DocumentJson.read("""
                        [{"id": "s1", "currentDays": 12}]""")));

        assertThat(upgraded.get("data/streak_goals.json")).isEqualTo(DocumentJson.read("[]"));
        assertThat(upgraded.get("data/streaks.json")).isEqualTo(DocumentJson.read("""
                [{"id": "s1", "currentDays": 12}]"""));
    }

    @Test
    void leavesAnExistingStreakGoalFileToTheValidator() {
        Map<String, JsonNode> upgraded = upgrader.upgrade(Map.of("data/streak_goals.json", DocumentJson.read("{}")));

        assertThat(upgraded.get("data/streak_goals.json")).isEqualTo(DocumentJson.read("{}"));
    }

    @Test
    void readsVersion4() {
        assertThat(upgrader.fromVersion()).isEqualTo(4);
    }
}
