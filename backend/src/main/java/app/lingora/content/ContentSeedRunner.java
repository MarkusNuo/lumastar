package app.lingora.content;

import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the content at startup. A missing content directory is skipped with a warning; invalid content aborts
 * the startup so that broken content never reaches the learner.
 */
@Component
class ContentSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ContentSeedRunner.class);

    private final ContentProperties properties;
    private final ContentLoader loader;
    private final ContentSeeder seeder;

    ContentSeedRunner(ContentProperties properties, ContentLoader loader, ContentSeeder seeder) {
        this.properties = properties;
        this.loader = loader;
        this.seeder = seeder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.seedOnStartup()) {
            return;
        }
        Path root = properties.directory();
        if (!Files.isDirectory(root)) {
            log.warn("Content directory {} not found; skipping the content seed", root);
            return;
        }
        SeedSummary summary = seeder.seed(loader.load(root));
        log.info("Content seeded from {}: {}", root, summary);
    }
}
