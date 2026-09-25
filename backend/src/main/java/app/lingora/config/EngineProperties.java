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
        RULE_BASED("rule_based_v1"),
        AI("ai_v1");

        private final String id;

        Engine(String id) {
            this.id = id;
        }

        /** Stored with every composed lesson and evaluated answer, e.g. {@code sessions.composed_by}. */
        public String id() {
            return id;
        }
    }
}
