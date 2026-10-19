package app.lumastar;

import java.time.Instant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

/**
 * Integration tests that move the application's clock, e.g. across days, time zones and DST changes. They share a
 * Spring context of their own, in which every bean uses {@link #clock}; each test sets it before it starts.
 */
@Import(ClockedIntegrationTest.TestClockConfiguration.class)
public abstract class ClockedIntegrationTest extends IntegrationTest {

    /** A Monday morning in Zurich. */
    protected static final Instant MONDAY_MORNING = Instant.parse("2026-10-05T08:00:00Z");

    @Autowired
    protected MutableClock clock;

    @TestConfiguration(proxyBeanMethods = false)
    static class TestClockConfiguration {

        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(MONDAY_MORNING);
        }
    }
}
