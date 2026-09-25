package app.lingora.config;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.core.evaluation.AnswerEvaluator;
import app.lingora.core.evaluation.RuleBasedAnswerEvaluator;
import app.lingora.core.lesson.LessonComposer;
import app.lingora.core.lesson.RuleBasedLessonComposer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

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
        assertThat(lessonComposer).isInstanceOf(RuleBasedLessonComposer.class);
    }
}
