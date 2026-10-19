package app.lumastar.export;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lumastar.export.BackupRejectedException.Reason;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.util.unit.DataSize;

class BackupArchiveReaderTest {

    private final BackupArchiveReader reader = new BackupArchiveReader(
            new BackupProperties(DataSize.ofMegabytes(20), DataSize.ofKilobytes(64), 5));

    @Test
    void readsTheFileEntriesAndSkipsDirectories() {
        byte[] archive = ZipFiles.zip(ordered("manifest.json", "{}", "data/", "", "data/profile.json", "{\"a\": 1}"));

        assertThat(reader.read(new ByteArrayInputStream(archive)))
                .containsOnlyKeys("manifest.json", "data/profile.json")
                .hasEntrySatisfying("data/profile.json",
                        content -> assertThat(new String(content, StandardCharsets.UTF_8)).isEqualTo("{\"a\": 1}"));
    }

    @Test
    void rejectsEntryNamesThatCouldEscapeADirectory() {
        for (String unsafe : List.of("../evil.json", "data/../../evil.json", "/etc/passwd", "C:/evil.json",
                "data\\..\\evil.json")) {
            byte[] archive = ZipFiles.zip(ordered("manifest.json", "{}", unsafe, "{}"));

            assertRejected(archive, Reason.INVALID_ARCHIVE, "unsafe entry name");
        }
    }

    @Test
    void rejectsDuplicateEntries() {
        // ZipOutputStream refuses duplicate names, so the second name is patched in the local header afterwards
        byte[] archive = ZipFiles.zip(ordered("manifest.json", "{}", "manifest.jsoX", "{}"));
        String bytes = new String(archive, StandardCharsets.ISO_8859_1);
        byte[] duplicate = bytes.replaceFirst("manifest\\.jsoX", "manifest.json").getBytes(StandardCharsets.ISO_8859_1);

        assertRejected(duplicate, Reason.INVALID_ARCHIVE, "twice");
    }

    @Test
    void rejectsTooManyEntries() {
        byte[] archive = ZipFiles.zip(ordered("a", "", "b", "", "c", "", "d", "", "e", "", "f", ""));

        assertRejected(archive, Reason.INVALID_ARCHIVE, "more than 5 entries");
    }

    @Test
    void rejectsContentThatUnpacksBeyondTheLimit() {
        byte[] bomb = ZipFiles.zip(ordered("data/attempts.json", "0".repeat(40_000), "data/sessions.json", "0".repeat(40_000)));

        assertThat(bomb.length).isLessThan(1_000);
        assertRejected(bomb, Reason.TOO_LARGE, "exceeds 65536B");
    }

    @Test
    void findsNoEntriesInAFileThatIsNotAZipArchive() {
        assertThat(reader.read(new ByteArrayInputStream("not a zip".getBytes(StandardCharsets.UTF_8)))).isEmpty();
    }

    @Test
    void acceptsOnlyRelativePathsWithoutParentSegments() {
        assertThat(BackupArchiveReader.isSafe("data/attempts.json")).isTrue();
        assertThat(BackupArchiveReader.isSafe("documents/learner_summary.md")).isTrue();
        assertThat(BackupArchiveReader.isSafe("data/..json")).isTrue();
        assertThat(BackupArchiveReader.isSafe("")).isFalse();
        assertThat(BackupArchiveReader.isSafe("..")).isFalse();
    }

    private void assertRejected(byte[] archive, Reason reason, String message) {
        assertThatThrownBy(() -> reader.read(new ByteArrayInputStream(archive)))
                .isInstanceOfSatisfying(BackupRejectedException.class, rejection -> assertThat(rejection.reason()).isEqualTo(reason))
                .hasMessageContaining(message);
    }

    private static Map<String, String> ordered(String... namesAndContents) {
        Map<String, String> entries = new LinkedHashMap<>();
        for (int i = 0; i < namesAndContents.length; i += 2) {
            entries.put(namesAndContents[i], namesAndContents[i + 1]);
        }
        return entries;
    }
}
