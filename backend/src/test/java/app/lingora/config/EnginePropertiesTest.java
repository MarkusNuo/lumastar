package app.lingora.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.IntegrationTest;
import app.lingora.core.evaluation.AnswerEvaluator;
import app.lingora.core.evaluation.RuleBasedAnswerEvaluator;
import app.lingora.core.lesson.LessonComposer;
import app.lingora.core.lesson.RuleBasedComposer;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

class EnginePropertiesTest extends IntegrationTest {

    @Autowired
    private EngineProperties engineProperties;

    @Autowired
    private AnswerEvaluator answerEvaluator;

    @Autowired
    private LessonComposer lessonComposer;

    @Test
    void selectsTheRuleBasedEnginesByDefault() {
        assertThat(engineProperties.engine()).isEqualTo(EngineProperties.Engine.RULE_BASED);
        assertThat(engineProperties.engine().id()).isEqualTo("rule_based_v1");
        assertThat(answerEvaluator).isInstanceOf(RuleBasedAnswerEvaluator.class);
        assertThat(lessonComposer).isInstanceOf(RuleBasedComposer.class);
    }

    @Test
    void refusesToBindTheAiEnginesOfPhaseTwo() {
        Binder binder = new Binder(new MapConfigurationPropertySource(Map.of("lingora.engine", "ai")));

        assertThatThrownBy(() -> binder.bind("lingora", EngineProperties.class))
                .rootCause()
                .hasMessageContaining("AI engines are Phase 2 (milestone M7)");
    }
}
