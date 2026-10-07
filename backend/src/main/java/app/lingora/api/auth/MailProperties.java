package app.lingora.api.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Account mails ({@code lingora.mail}); the SMTP server is configured with {@code spring.mail.*}. Mails are sent by a
 * background thread unless {@code async} is off, as in the integration tests.
 */
@ConfigurationProperties("lingora.mail")
public record MailProperties(
        @DefaultValue("Lingora <noreply@lingora.local>") String from,
        @DefaultValue("true") boolean async) {
}
