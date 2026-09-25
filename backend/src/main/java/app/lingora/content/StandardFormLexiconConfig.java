package app.lingora.content;

import app.lingora.core.evaluation.StandardFormLexicon;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The Standard-form lexicon of the evaluator, read once from the content directory's Gheg blocklist. */
@Configuration(proxyBeanMethods = false)
class StandardFormLexiconConfig {

    private static final Logger log = LoggerFactory.getLogger(StandardFormLexiconConfig.class);

    @Bean
    StandardFormLexicon standardFormLexicon(ContentProperties properties) {
        Path file = properties.directory().resolve(GhegBlocklistReader.FILE);
        if (!Files.isRegularFile(file)) {
            log.warn("Gheg blocklist {} not found; Standard forms are only recognised from the exercises' standardForms", file);
            return StandardFormLexicon.empty();
        }
        return GhegBlocklistReader.read(file);
    }
}
