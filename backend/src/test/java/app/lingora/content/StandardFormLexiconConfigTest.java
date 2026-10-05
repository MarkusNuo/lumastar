package app.lingora.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.core.evaluation.StandardFormLexicon;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class StandardFormLexiconConfigTest {

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(StandardFormLexiconConfig.class);

    @Test
    void readsTheBlocklistOfTheContentDirectory() {
        context.withBean(ContentProperties.class, () -> new ContentProperties("../content", false))
                .run(started -> assertThat(started.getBean(StandardFormLexicon.class).words()).isNotEmpty());
    }

    @Test
    void failsTheStartupWithoutTheBlocklist(@TempDir Path emptyContent) {
        context.withBean(ContentProperties.class, () -> new ContentProperties(emptyContent.toString(), false))
                .run(started -> assertThat(started).hasFailed().getFailure().rootCause()
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("gheg_blocklist.json not found")
                        .hasMessageContaining("lingora.content.path"));
    }
}
