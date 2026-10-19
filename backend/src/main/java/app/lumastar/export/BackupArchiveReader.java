package app.lumastar.export;

import app.lumastar.export.BackupRejectedException.Reason;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipInputStream;

/**
 * Unpacks an export into memory, within the limits of {@link BackupProperties}. Nothing is written to disk; entry
 * names that could escape a directory when unpacked elsewhere (zip slip) are rejected all the same.
 */
final class BackupArchiveReader {

    private final BackupProperties limits;

    BackupArchiveReader(BackupProperties limits) {
        this.limits = limits;
    }

    /** The file entries by name; directory entries are skipped. */
    Map<String, byte[]> read(InputStream archive) {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        long unpacked = 0;
        int count = 0;
        try (ZipInputStream zip = new ZipInputStream(archive, StandardCharsets.UTF_8)) {
            for (ZipEntry entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                if (++count > limits.maxEntries()) {
                    throw rejected(Reason.INVALID_ARCHIVE, "The export contains more than %d entries.".formatted(limits.maxEntries()));
                }
                String name = entry.getName();
                if (!isSafe(name)) {
                    throw rejected(Reason.INVALID_ARCHIVE, "The export contains the unsafe entry name '%s'.".formatted(name));
                }
                if (entry.isDirectory()) {
                    continue;
                }
                byte[] content = readAtMost(zip, limits.maxUnpackedSize().toBytes() - unpacked);
                unpacked += content.length;
                if (entries.put(name, content) != null) {
                    throw rejected(Reason.INVALID_ARCHIVE, "The export contains the entry '%s' twice.".formatted(name));
                }
            }
        } catch (ZipException e) {
            throw rejected(Reason.INVALID_ARCHIVE, "The file is not a valid ZIP archive: " + e.getMessage());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return entries;
    }

    private byte[] readAtMost(ZipInputStream zip, long remaining) throws IOException {
        byte[] content = zip.readNBytes((int) Math.min(Integer.MAX_VALUE - 8, remaining + 1));
        if (content.length > remaining) {
            throw rejected(Reason.TOO_LARGE, "The unpacked export exceeds %s.".formatted(limits.maxUnpackedSize()));
        }
        return content;
    }

    /** A relative path without {@code ..} segments, backslashes or drive letters. */
    static boolean isSafe(String name) {
        return !name.isEmpty() && !name.startsWith("/") && !name.contains("\\") && !name.contains(":")
                && Arrays.stream(name.split("/")).noneMatch(".."::equals);
    }

    private static BackupRejectedException rejected(Reason reason, String message) {
        return BackupRejectedException.of(reason, message);
    }
}
