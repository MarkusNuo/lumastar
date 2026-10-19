package app.lumastar.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.random.RandomGenerator;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class LessonPropertiesTest {

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(EnabledLessonProperties.class);

    @Test
    void aConfiguredSeedMakesTheShufflingReproducible() {
        context.withPropertyValues("lumastar.lesson.random-seed=42").run(started -> {
            LessonProperties properties = started.getBean(LessonProperties.class);

            assertThat(sequence(properties.random())).isEqualTo(sequence(properties.random()));
        });
    }

    @Test
    void withoutASeedEveryShufflingIsFresh() {
        context.run(started -> assertThat(started.getBean(LessonProperties.class).randomSeed()).isNull());
    }

    private static int[] sequence(RandomGenerator random) {
        return IntStream.range(0, 10).map(i -> random.nextInt(1_000)).toArray();
    }

    @EnableConfigurationProperties(LessonProperties.class)
    static class EnabledLessonProperties {
    }
}
