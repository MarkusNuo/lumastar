package app.lumastar.config;

import app.lumastar.core.mastery.MasteryCalculator;
import app.lumastar.core.mastery.MasteryRules;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The mastery rule; it is the same for every engine, since mastery is the learner model itself. */
@Configuration(proxyBeanMethods = false)
class MasteryConfig {

    @Bean
    MasteryCalculator masteryCalculator() {
        return new MasteryCalculator(MasteryRules.DEFAULT);
    }
}
