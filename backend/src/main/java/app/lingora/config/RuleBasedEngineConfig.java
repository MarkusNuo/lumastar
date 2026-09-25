package app.lingora.config;

import app.lingora.core.evaluation.AnswerEvaluator;
import app.lingora.core.evaluation.RuleBasedAnswerEvaluator;
import app.lingora.core.evaluation.StandardFormLexicon;
import app.lingora.core.lesson.LessonComposer;
import app.lingora.core.lesson.RuleBasedLessonComposer;
import app.lingora.core.placement.PlacementEngineFactory;
import app.lingora.core.placement.RuleBasedPlacementEngine;
import app.lingora.core.plan.PlanGeneratorFactory;
import app.lingora.core.plan.RuleBasedPlanGenerator;
import java.time.Clock;
import java.util.Random;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The phase 1 engines of PRD 10.2, active for {@code lingora.engine=rule-based} (the default). */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "lingora.engine", havingValue = "rule-based", matchIfMissing = true)
class RuleBasedEngineConfig {

    @Bean
    AnswerEvaluator answerEvaluator(StandardFormLexicon standardFormLexicon) {
        return new RuleBasedAnswerEvaluator(standardFormLexicon);
    }

    @Bean
    LessonComposer lessonComposer() {
        return new RuleBasedLessonComposer(new Random());
    }

    @Bean
    PlacementEngineFactory placementEngineFactory() {
        return itemBank -> new RuleBasedPlacementEngine(itemBank, new Random());
    }

    @Bean
    PlanGeneratorFactory planGeneratorFactory(Clock clock) {
        return (curriculum, skillTagLabels) -> new RuleBasedPlanGenerator(curriculum, skillTagLabels, clock);
    }
}
