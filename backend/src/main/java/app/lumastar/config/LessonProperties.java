package app.lumastar.config;

import java.util.Random;
import java.util.random.RandomGenerator;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Lesson composition settings. {@code lumastar.lesson.random-seed} fixes the composer's shuffling so that a sequence of
 * lessons is reproducible (e2e tests via {@code bootTestRun}); without it every start shuffles anew.
 */
@ConfigurationProperties("lumastar.lesson")
public record LessonProperties(Long randomSeed) {

    RandomGenerator random() {
        return randomSeed == null ? new Random() : new Random(randomSeed);
    }
}
