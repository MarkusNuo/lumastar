package app.lumastar.export;

import app.lumastar.export.BackupRejectedException.Reason;
import java.time.DateTimeException;
import java.time.Instant;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;

/** {@code manifest.json}: what the export contains; an import reads its format version and export time. */
record BackupManifest(int schemaVersion, Instant exportedAt, String appVersion, BackupCounts counts) {

    /** The part of a manifest an import relies on. */
    record Header(int schemaVersion, Instant exportedAt) {
    }

    /** Reads only the {@link Header}, so that manifests of older and newer versions can be read alike. */
    static Header read(byte[] json) {
        if (json == null) {
            throw invalid("The file is not a Lumastar export: manifest.json is missing.");
        }
        try {
            JsonNode manifest = DocumentJson.MAPPER.readTree(json);
            JsonNode version = manifest.path("schemaVersion");
            JsonNode exportedAt = manifest.path("exportedAt");
            if (!version.isInt() || !exportedAt.isString()) {
                throw invalid("manifest.json needs an integer schemaVersion and an exportedAt timestamp.");
            }
            return new Header(version.intValue(), Instant.parse(exportedAt.asString()));
        } catch (JacksonException | DateTimeException e) {
            throw invalid("manifest.json is not valid: " + e.getMessage());
        }
    }

    private static BackupRejectedException invalid(String message) {
        return BackupRejectedException.of(Reason.INVALID_ARCHIVE, message);
    }
}
