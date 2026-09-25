package app.lingora.config;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class EnginePropertiesTest extends IntegrationTest {

    @Autowired
    private EngineProperties engineProperties;

    @Test
    void selectsTheRuleBasedEnginesByDefault() {
        assertThat(engineProperties.engine()).isEqualTo(EngineProperties.Engine.RULE_BASED);
    }
}
