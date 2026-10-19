package app.lumastar.config;

import app.lumastar.core.srs.FsrsScheduler;
import app.lumastar.core.srs.SpacedRepetitionSchedulerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** FSRS-6 schedules every review, whichever engine composes the lessons. */
@Configuration(proxyBeanMethods = false)
class SrsConfig {

    @Bean
    SpacedRepetitionSchedulerFactory spacedRepetitionSchedulers() {
        return FsrsScheduler.factory();
    }
}
