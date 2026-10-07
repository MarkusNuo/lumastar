package app.lingora.api.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Who may register ({@code lingora.registration}). In {@link RegistrationMode#INVITE invite} mode without a configured
 * invite code nobody can register.
 */
@ConfigurationProperties("lingora.registration")
public record RegistrationProperties(
        @DefaultValue("open") RegistrationMode mode,
        String inviteCode) {

    /**
     * Lets a registration with this invite code through.
     *
     * @throws app.lingora.api.error.ApiProblemException {@code registration_closed} or {@code invite_code_invalid}
     */
    void admit(String givenInviteCode) {
        switch (mode) {
            case CLOSED -> throw AccountProblems.registrationClosed();
            case INVITE -> {
                if (!matchesInviteCode(givenInviteCode)) {
                    throw AccountProblems.inviteCodeInvalid();
                }
            }
            case OPEN -> {
            }
        }
    }

    private boolean matchesInviteCode(String givenInviteCode) {
        return inviteCode != null && !inviteCode.isBlank() && givenInviteCode != null
                && MessageDigest.isEqual(inviteCode.strip().getBytes(StandardCharsets.UTF_8),
                givenInviteCode.strip().getBytes(StandardCharsets.UTF_8));
    }
}
