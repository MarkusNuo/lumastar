package app.lumastar.export;

import app.lumastar.export.BackupRejectedException.Reason;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** Brings the data files of an export of any supported version to the current {@link ExportFormat#SCHEMA_VERSION}. */
@Component
class BackupUpgraderChain {

    private static final int FIRST_VERSION = 1;

    private final int currentVersion;
    private final Map<Integer, BackupUpgrader> upgraders;

    @Autowired
    BackupUpgraderChain(ObjectProvider<BackupUpgrader> upgraders) {
        this(ExportFormat.SCHEMA_VERSION, upgraders.orderedStream().toList());
    }

    BackupUpgraderChain(int currentVersion, List<BackupUpgrader> upgraders) {
        this.currentVersion = currentVersion;
        this.upgraders = upgraders.stream().collect(Collectors.toMap(BackupUpgrader::fromVersion, Function.identity()));
        for (int version = FIRST_VERSION; version < currentVersion; version++) {
            if (!this.upgraders.containsKey(version)) {
                throw new IllegalStateException("No BackupUpgrader from export version %d to %d".formatted(version, version + 1));
            }
        }
    }

    Map<String, JsonNode> upgrade(int version, Map<String, JsonNode> dataFiles) {
        if (version > currentVersion) {
            throw BackupRejectedException.of(Reason.UNSUPPORTED_SCHEMA_VERSION, ("The export has format version %d, but this "
                    + "Lumastar reads versions up to %d. Update Lumastar first.").formatted(version, currentVersion));
        }
        if (version < FIRST_VERSION) {
            throw BackupRejectedException.of(Reason.INVALID_ARCHIVE, "Unknown export format version %d.".formatted(version));
        }
        Map<String, JsonNode> upgraded = dataFiles;
        for (int from = version; from < currentVersion; from++) {
            upgraded = upgraders.get(from).upgrade(upgraded);
        }
        return upgraded;
    }
}
