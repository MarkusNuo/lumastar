package app.lumastar.export;

import app.lumastar.export.BackupDataValidator.ValidBackup;
import app.lumastar.export.BackupRejectedException.Issue;
import app.lumastar.export.BackupRejectedException.Reason;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionOperations;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;

/**
 * Restores an export: all learner data of the account is replaced in one transaction; the account identity
 * (id, e-mail, password) stays. Exports of older format versions are upgraded first; the profile documents in
 * the file are views and are not read. Unpacking, upgrading and validating the file happen before the transaction, so
 * that a large upload never holds database locks.
 */
@Service
public class BackupImporter {

    private final BackupProperties limits;
    private final BackupArchiveReader archiveReader;
    private final BackupUpgraderChain upgraders;
    private final BackupDataValidator validator = new BackupDataValidator();
    private final ContentReferenceCheck contentReferences;
    private final LearnerDataStore store;
    private final TransactionOperations transactions;

    BackupImporter(BackupProperties limits, BackupUpgraderChain upgraders, ContentReferenceCheck contentReferences,
                   LearnerDataStore store, TransactionOperations transactions) {
        this.limits = limits;
        this.archiveReader = new BackupArchiveReader(limits);
        this.upgraders = upgraders;
        this.contentReferences = contentReferences;
        this.store = store;
        this.transactions = transactions;
    }

    /** {@code size} is the size of the uploaded file in bytes. */
    public ImportResult importBackup(UUID userId, InputStream archive, long size) {
        if (size > limits.maxArchiveSize().toBytes()) {
            throw BackupRejectedException.of(Reason.TOO_LARGE, "The file exceeds %s.".formatted(limits.maxArchiveSize()));
        }
        Map<String, byte[]> entries = archiveReader.read(archive);
        BackupManifest.Header manifest = BackupManifest.read(entries.get(ExportFormat.MANIFEST));
        Map<String, JsonNode> dataFiles = upgraders.upgrade(manifest.schemaVersion(), dataFiles(entries));
        ValidBackup backup = validator.validate(dataFiles);
        Map<String, Integer> counts = transactions.execute(transaction -> {
            contentReferences.requireKnownContent(backup);
            return store.replace(userId, backup);
        });
        return new ImportResult(manifest.schemaVersion(), manifest.exportedAt(), BackupCounts.of(counts));
    }

    private static Map<String, JsonNode> dataFiles(Map<String, byte[]> entries) {
        Map<String, JsonNode> dataFiles = new LinkedHashMap<>();
        entries.forEach((name, content) -> {
            if (name.startsWith(ExportFormat.DATA)) {
                try {
                    dataFiles.put(name, DocumentJson.MAPPER.readTree(content));
                } catch (JacksonException e) {
                    throw BackupRejectedException.invalidData(List.of(new Issue(name, "not valid JSON: " + e.getOriginalMessage())));
                }
            }
        });
        return dataFiles;
    }
}
