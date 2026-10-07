package app.lingora;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/** Replaces the SMTP sender by the {@link MailCatcher}. */
@TestConfiguration(proxyBeanMethods = false)
public class TestMailConfiguration {

    @Bean
    MailCatcher mailCatcher() {
        return new MailCatcher();
    }
}
