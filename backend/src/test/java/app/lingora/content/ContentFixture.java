package app.lingora.content;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Stream;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** The small, contract-conformant content set under {@code src/test/resources/content-fixture}. */
final class ContentFixture {

    static final String GREETINGS = "units/a1_u01_greetings.json";
    static final String FAMILY = "units/a1_u02_family.json";

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private ContentFixture() {
    }

    static Path path() {
        try {
            return Path.of(ContentFixture.class.getResource("/content-fixture").toURI());
        } catch (URISyntaxException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Copies the fixture into {@code target} so that a test can break it. */
    static Path copyTo(Path target) {
        Path source = path();
        try (Stream<Path> files = Files.walk(source)) {
            for (Path file : files.toList()) {
                Path copy = target.resolve(source.relativize(file).toString());
                if (Files.isDirectory(file)) {
                    Files.createDirectories(copy);
                } else {
                    Files.copy(file, copy);
                }
            }
            return target;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static void editJson(Path root, String file, Consumer<ObjectNode> change) {
        Path path = root.resolve(file);
        try {
            ObjectNode document = (ObjectNode) JSON.readTree(Files.readString(path));
            change.accept(document);
            Files.writeString(path, JSON.writerWithDefaultPrettyPrinter().writeValueAsString(document));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static ObjectNode exercise(ObjectNode document, int index) {
        return (ObjectNode) document.get("exercises").get(index);
    }

    static JsonNode strings(ObjectNode parent, String field, List<String> values) {
        var array = parent.putArray(field);
        values.forEach(array::add);
        return array;
    }
}
