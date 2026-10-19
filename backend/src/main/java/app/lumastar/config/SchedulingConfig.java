package app.lumastar.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Runs the {@code @Scheduled} jobs of PRD 11.1, e.g. the periodic plan revision. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
class SchedulingConfig {
}
