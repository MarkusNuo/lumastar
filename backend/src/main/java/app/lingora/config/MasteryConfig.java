package app.lingora.config;

import app.lingora.core.mastery.MasteryCalculator;
import app.lingora.core.mastery.MasteryRules;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The mastery rule of PRD 8.2; it is the same for every engine, since mastery is the learner model itself. */
@Configuration(proxyBeanMethods = false)
class MasteryConfig {

    @Bean
    MasteryCalculator masteryCalculator() {
        return new MasteryCalculator(MasteryRules.DEFAULT);
    }
}
