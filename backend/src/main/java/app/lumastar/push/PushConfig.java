package app.lumastar.push;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

@Configuration(proxyBeanMethods = false)
class PushConfig {

    @Bean
    PushSetup pushSetup(PushProperties properties) {
        return PushSetup.from(properties);
    }

    @Bean
    PushEndpoints pushEndpoints(PushProperties properties) {
        return new PushEndpoints(properties.endpointHosts(), properties.requireHttps());
    }

    @Bean
    WebPushSender webPushSender(PushSetup setup, PushProperties properties, JsonMapper json, Clock clock) {
        return new WebPushSender(setup, json, clock, properties.timeout());
    }

    @Bean
    PushDispatcher pushDispatcher(PushSender sender, PushProperties properties) {
        return new PushDispatcher(sender, properties.parallelSends());
    }
}
