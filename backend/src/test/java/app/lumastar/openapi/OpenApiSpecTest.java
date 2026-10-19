package app.lumastar.openapi;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import java.io.IOException;
import java.nio.file.Files;
import org.junit.jupiter.api.Test;

/** Keeps the committed contract, from which the frontend client is generated, in sync with the code. */
class OpenApiSpecTest extends IntegrationTest {

    @Test
    void committedSpecMatchesTheLiveApi() throws IOException {
        String live = OpenApiSpec.live(mvc);
        String committed = Files.exists(OpenApiSpec.FILE) ? OpenApiSpec.canonical(Files.readString(OpenApiSpec.FILE)) : "";

        assertThat(committed.equals(live))
                .withFailMessage("OpenAPI spec is outdated – run ./gradlew exportOpenApi")
                .isTrue();
    }
}
