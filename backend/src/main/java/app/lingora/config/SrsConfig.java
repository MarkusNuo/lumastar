package app.lingora.config;

import app.lingora.core.srs.FsrsScheduler;
import app.lingora.core.srs.SpacedRepetitionSchedulerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** FSRS-6 schedules every review (PRD F8), whichever engine composes the lessons. */
@Configuration(proxyBeanMethods = false)
class SrsConfig {

    @Bean
    SpacedRepetitionSchedulerFactory spacedRepetitionSchedulers() {
        return FsrsScheduler.factory();
    }
}
