package app.lumastar.export;

import java.util.Map;
import tools.jackson.databind.JsonNode;

/**
 * Converts the data files of an older export into the next format version (PRD 13: old exports stay importable).
 * Upgraders are Spring beans; {@link BackupUpgraderChain} applies them one version after the other.
 */
public interface BackupUpgrader {

    /** The version this upgrader reads; it returns the files in version {@code fromVersion() + 1}. */
    int fromVersion();

    /** The data files by path, e.g. {@code data/attempts.json}. */
    Map<String, JsonNode> upgrade(Map<String, JsonNode> dataFiles);
}
