package app.lingora.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.random.RandomGenerator;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class PlacementPropertiesTest {

    private final ApplicationContextRunner context = new ApplicationContextRunner()
            .withUserConfiguration(EnabledPlacementProperties.class);

    @Test
    void aConfiguredSeedMakesTheItemChoiceReproducible() {
        context.withPropertyValues("lingora.placement.random-seed=42").run(started -> {
            PlacementProperties properties = started.getBean(PlacementProperties.class);

            assertThat(sequence(properties.random())).isEqualTo(sequence(properties.random()));
        });
    }

    @Test
    void withoutASeedEveryChoiceIsFresh() {
        context.run(started -> assertThat(started.getBean(PlacementProperties.class).randomSeed()).isNull());
    }

    private static int[] sequence(RandomGenerator random) {
        return IntStream.range(0, 10).map(i -> random.nextInt(1_000)).toArray();
    }

    @EnableConfigurationProperties(PlacementProperties.class)
    static class EnabledPlacementProperties {
    }
}
