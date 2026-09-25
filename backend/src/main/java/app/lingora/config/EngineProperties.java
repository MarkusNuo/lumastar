package app.lingora.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Selects the engine implementations ({@code lingora.engine=rule-based|ai}). Implementations are wired with
 * {@code @ConditionalOnProperty(name = "lingora.engine", havingValue = "rule-based", matchIfMissing = true)}.
 */
@ConfigurationProperties("lingora")
public record EngineProperties(@DefaultValue("rule-based") Engine engine) {

    public enum Engine {
        RULE_BASED,
        AI
    }
}
