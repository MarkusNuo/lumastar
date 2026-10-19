package app.lumastar.export;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** What an import has restored: the format version and export time of the file and the rows per table. */
public record ImportResult(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Export format version of the file") int schemaVersion,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "When the file was exported") Instant exportedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) BackupCounts imported) {
}
