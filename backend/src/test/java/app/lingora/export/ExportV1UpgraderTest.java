package app.lingora.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class ExportV1UpgraderTest {

    private final ExportV1Upgrader upgrader = new ExportV1Upgrader();

    @Test
    void addsTheBadgesTheCheckpointResultsAndTheTargetRetention() {
        Map<String, JsonNode> upgraded = upgrader.upgrade(Map.of(
                "data/sessions.json", DocumentJson.read("""
                        [{"id": "s1", "kind": "lesson"}]"""),
                "data/review_log.json", DocumentJson.read("""
                        [{"id": "r1", "rating": "good"}, {"id": "r2", "rating": "again"}]"""),
                "data/attempts.json", DocumentJson.read("[]")));

        assertThat(upgraded.get("data/sessions.json")).isEqualTo(DocumentJson.read("""
                [{"id": "s1", "kind": "lesson", "checkpointPassed": null}]"""));
        assertThat(upgraded.get("data/review_log.json")).isEqualTo(DocumentJson.read("""
                [{"id": "r1", "rating": "good", "requestRetention": 0.9},
                 {"id": "r2", "rating": "again", "requestRetention": 0.9}]"""));
        assertThat(upgraded.get("data/badges.json")).isEqualTo(DocumentJson.read("[]"));
        assertThat(upgraded.get("data/attempts.json")).isEqualTo(DocumentJson.read("[]"));
    }

    @Test
    void leavesMalformedFilesToTheValidator() {
        Map<String, JsonNode> upgraded = upgrader.upgrade(Map.of("data/sessions.json", DocumentJson.read("{}")));

        assertThat(upgraded.get("data/sessions.json")).isEqualTo(DocumentJson.read("{}"));
        assertThat(upgraded).doesNotContainKey("data/review_log.json");
    }

    @Test
    void readsVersion1() {
        assertThat(upgrader.fromVersion()).isEqualTo(1);
    }
}
