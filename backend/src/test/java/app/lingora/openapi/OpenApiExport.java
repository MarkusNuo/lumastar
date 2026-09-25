package app.lingora.openapi;

import app.lingora.IntegrationTest;
import java.io.IOException;
import java.nio.file.Files;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

/** Not part of {@code test}; run by {@code ./gradlew exportOpenApi}. */
@Tag("openapi-export")
class OpenApiExport extends IntegrationTest {

    @Test
    void writesTheSpec() throws IOException {
        Files.createDirectories(OpenApiSpec.FILE.getParent());
        Files.writeString(OpenApiSpec.FILE, OpenApiSpec.live(mvc));
    }
}
