package app.lumastar.config;

import app.lumastar.core.evaluation.AnswerEvaluator;
import app.lumastar.core.evaluation.RuleBasedAnswerEvaluator;
import app.lumastar.core.evaluation.StandardFormLexicon;
import app.lumastar.core.lesson.ExerciseBank;
import app.lumastar.core.lesson.LessonComposer;
import app.lumastar.core.lesson.RuleBasedComposer;
import app.lumastar.core.placement.PlacementEngineFactory;
import app.lumastar.core.placement.RuleBasedPlacementEngine;
import app.lumastar.core.plan.PlanGeneratorFactory;
import app.lumastar.core.plan.RuleBasedPlanGenerator;
import java.time.Clock;
import java.util.random.RandomGenerator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The phase 1 engines of PRD 10.2, active for {@code lumastar.engine=rule-based} (the default). */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "lumastar.engine", havingValue = "rule-based", matchIfMissing = true)
class RuleBasedEngineConfig {

    @Bean
    AnswerEvaluator answerEvaluator(StandardFormLexicon standardFormLexicon) {
        return new RuleBasedAnswerEvaluator(standardFormLexicon);
    }

    @Bean
    LessonComposer lessonComposer(LessonProperties properties, ExerciseBank bank) {
        return new RuleBasedComposer(properties.random(), bank);
    }

    @Bean
    PlacementEngineFactory placementEngineFactory(PlacementProperties properties) {
        RandomGenerator random = properties.random();
        return itemBank -> new RuleBasedPlacementEngine(itemBank, random);
    }

    @Bean
    PlanGeneratorFactory planGeneratorFactory(Clock clock) {
        return (curriculum, skillTagLabels) -> new RuleBasedPlanGenerator(curriculum, skillTagLabels, clock);
    }
}
