package app.lumastar.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Selects the engine implementations ({@code lumastar.engine=rule-based|ai}). Implementations are wired with
 * {@code @ConditionalOnProperty(name = "lumastar.engine", havingValue = "rule-based", matchIfMissing = true)}.
 */
@ConfigurationProperties("lumastar")
public record EngineProperties(@DefaultValue("rule-based") Engine engine) {

    /** Fails the startup with a clear message instead of a missing bean further down. */
    public EngineProperties {
        if (engine == Engine.AI) {
            throw new IllegalArgumentException("lumastar.engine=ai is not available: the AI engines are not "
                    + "implemented yet. Use lumastar.engine=rule-based.");
        }
    }

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
