package app.lumastar.export;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.info.BuildProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * The export ZIP: {@code manifest.json}, the profile documents under {@code documents/} and the complete
 * learner data under {@code data/}, read from one consistent database snapshot. The account identity (e-mail, password
 * hash) and the links of account mails are never exported.
 */
@Service
public class BackupExporter {

    private final LearnerDataStore store;
    private final ProfileDocuments documents;
    private final Clock clock;
    private final String appVersion;

    BackupExporter(LearnerDataStore store, ProfileDocuments documents, Clock clock, ObjectProvider<BuildProperties> build) {
        this.store = store;
        this.documents = documents;
        this.clock = clock;
        BuildProperties properties = build.getIfAvailable();
        this.appVersion = properties == null ? "unknown" : properties.getVersion();
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public BackupFile export(UUID userId) {
        store.writeTimestampsInUtc();
        Instant exportedAt = clock.instant();
        ObjectNode profile = store.profile(userId);
        Map<LearnerTable, ArrayNode> tables = new LinkedHashMap<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (LearnerTable table : LearnerTables.ALL) {
            ArrayNode rows = store.rows(userId, table);
            tables.put(table, rows);
            counts.put(table.name(), rows.size());
        }
        BackupManifest manifest = new BackupManifest(ExportFormat.SCHEMA_VERSION, exportedAt, appVersion, BackupCounts.of(counts));

        ByteArrayOutputStream archive = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(archive, StandardCharsets.UTF_8)) {
            add(zip, ExportFormat.MANIFEST, DocumentJson.write(manifest), exportedAt);
            for (RenderedDocument document : documents.renderAll(userId)) {
                add(zip, ExportFormat.DOCUMENTS + document.document().fileName(), document.content(), exportedAt);
            }
            add(zip, ExportFormat.PROFILE_DATA, DocumentJson.write(profile), exportedAt);
            for (Map.Entry<LearnerTable, ArrayNode> table : tables.entrySet()) {
                add(zip, table.getKey().file(), DocumentJson.write(table.getValue()), exportedAt);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        ZoneId timeZone = ZoneId.of(profile.get(LearnerTable.key("time_zone")).asString());
        return new BackupFile("lumastar-export-%s.zip".formatted(LocalDate.ofInstant(exportedAt, timeZone)), archive.toByteArray());
    }

    private static void add(ZipOutputStream zip, String name, byte[] content, Instant modified) throws IOException {
        ZipEntry entry = new ZipEntry(name);
        entry.setTime(modified.toEpochMilli());
        zip.putNextEntry(entry);
        zip.write(content);
        zip.closeEntry();
    }
}
