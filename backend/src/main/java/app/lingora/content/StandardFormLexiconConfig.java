package app.lingora.content;

import app.lingora.core.evaluation.StandardFormLexicon;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The Standard-form lexicon of the evaluator and the app's pre-check, read once from the content directory's Gheg
 * blocklist. Without it Standard forms would silently count as wrong, so a missing file fails the startup.
 */
@Configuration(proxyBeanMethods = false)
class StandardFormLexiconConfig {

    @Bean
    StandardFormLexicon standardFormLexicon(ContentProperties properties) {
        Path file = properties.directory().resolve(GhegBlocklistReader.FILE);
        if (!Files.isRegularFile(file)) {
            throw new IllegalStateException(("Gheg blocklist %s not found: the answer evaluator needs it to recognise "
                    + "Standard Albanian forms. Point lingora.content.path (LINGORA_CONTENT_PATH) to the /content directory.")
                    .formatted(file));
        }
        return GhegBlocklistReader.read(file);
    }
}
