package app.lingora.export;

/** An export ZIP ready for download. */
public record BackupFile(String fileName, byte[] content) {
}
