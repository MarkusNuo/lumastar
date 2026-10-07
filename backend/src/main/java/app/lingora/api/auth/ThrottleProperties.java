package app.lingora.api.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Limits against abuse of the public account endpoints ({@code lingora.throttle}), per hour: registrations and password
 * reset requests per client ({@link ClientKey}), reset requests per e-mail address, verification or e-mail change mails per
 * account, and test notifications per account. Sign-in attempts have their own lockout ({@link LoginThrottle}).
 */
@ConfigurationProperties("lingora.throttle")
public record ThrottleProperties(
        @DefaultValue("5") int registrationsPerHour,
        @DefaultValue("10") int passwordResetsPerHour,
        @DefaultValue("3") int passwordResetsPerEmailPerHour,
        @DefaultValue("5") int accountMailsPerHour,
        @DefaultValue("10") int pushTestsPerHour) {
}
