package app.lingora;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Replaces the web push sender by the {@link RecordingPushSender}: tests never reach a real push service. */
@TestConfiguration(proxyBeanMethods = false)
public class TestPushConfiguration {

    @Bean
    @Primary
    RecordingPushSender recordingPushSender() {
        return new RecordingPushSender();
    }
}
