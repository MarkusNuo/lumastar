package app.lumastar.config;

import java.util.Random;
import java.util.random.RandomGenerator;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Placement test settings. {@code lumastar.placement.random-seed} fixes the choice among the items of a level, so that a
 * sequence of placement tests is reproducible (e2e tests via {@code bootTestRun}); without it every start chooses anew.
 */
@ConfigurationProperties("lumastar.placement")
public record PlacementProperties(Long randomSeed) {

    RandomGenerator random() {
        return randomSeed == null ? new Random() : new Random(randomSeed);
    }
}
