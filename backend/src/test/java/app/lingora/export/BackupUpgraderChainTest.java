package app.lingora.export;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.export.BackupRejectedException.Reason;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

class BackupUpgraderChainTest {

    private static final Map<String, JsonNode> VERSION_1_FILES = Map.of(ExportFormat.PROFILE_DATA,
            DocumentJson.read("""
                    {"displayName": "Erza"}"""));

    @Test
    void passesAnExportOfTheCurrentVersionThroughUnchanged() {
        BackupUpgraderChain chain = new BackupUpgraderChain(ExportFormat.SCHEMA_VERSION, List.of(new ExportV1Upgrader()));

        assertThat(chain.upgrade(ExportFormat.SCHEMA_VERSION, VERSION_1_FILES)).isSameAs(VERSION_1_FILES);
    }

    @Test
    void appliesTheUpgradersOfAnOlderExportOneVersionAfterTheOther() {
        BackupUpgraderChain chain = new BackupUpgraderChain(3, List.of(renaming(2, "nickname", "handle"),
                renaming(1, "displayName", "nickname")));

        Map<String, JsonNode> upgraded = chain.upgrade(1, VERSION_1_FILES);

        assertThat(upgraded.get(ExportFormat.PROFILE_DATA)).isEqualTo(DocumentJson.read("""
                {"handle": "Erza"}"""));
        assertThat(chain.upgrade(2, Map.of(ExportFormat.PROFILE_DATA, DocumentJson.read("""
                {"nickname": "Erza"}""")))).isEqualTo(upgraded);
    }

    @Test
    void rejectsAnExportOfANewerOrAnUnknownVersion() {
        BackupUpgraderChain chain = new BackupUpgraderChain(ExportFormat.SCHEMA_VERSION, List.of(new ExportV1Upgrader()));

        assertThatThrownBy(() -> chain.upgrade(ExportFormat.SCHEMA_VERSION + 1, VERSION_1_FILES))
                .isInstanceOfSatisfying(BackupRejectedException.class,
                        rejection -> assertThat(rejection.reason()).isEqualTo(Reason.UNSUPPORTED_SCHEMA_VERSION))
                .hasMessageContaining("Update Lingora first");
        assertThatThrownBy(() -> chain.upgrade(0, VERSION_1_FILES))
                .isInstanceOfSatisfying(BackupRejectedException.class,
                        rejection -> assertThat(rejection.reason()).isEqualTo(Reason.INVALID_ARCHIVE));
    }

    @Test
    void refusesToStartWithAGapInTheChain() {
        assertThatThrownBy(() -> new BackupUpgraderChain(3, List.of(renaming(1, "a", "b"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("from export version 2 to 3");
    }

    private static BackupUpgrader renaming(int fromVersion, String from, String to) {
        return new BackupUpgrader() {
            @Override
            public int fromVersion() {
                return fromVersion;
            }

            @Override
            public Map<String, JsonNode> upgrade(Map<String, JsonNode> dataFiles) {
                ObjectNode profile = ((ObjectNode) dataFiles.get(ExportFormat.PROFILE_DATA)).deepCopy();
                profile.set(to, profile.remove(from));
                Map<String, JsonNode> upgraded = new LinkedHashMap<>(dataFiles);
                upgraded.put(ExportFormat.PROFILE_DATA, profile);
                return upgraded;
            }
        };
    }
}
