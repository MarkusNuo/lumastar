package app.lumastar.api.auth;

import app.lumastar.api.auth.RequestThrottle.Action;
import app.lumastar.persistence.UserEntity;
import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates accounts as {@code lumastar.registration.mode} allows. The learner can start right away; the verification
 * mail is sent after the commit (DECISIONS #78).
 */
@Service
class Registration {

    private final RegistrationProperties properties;
    private final RequestThrottle throttle;
    private final AccountService accounts;
    private final Passwords passwords;
    private final EmailVerification verification;
    private final Clock clock;

    Registration(RegistrationProperties properties, RequestThrottle throttle, AccountService accounts, Passwords passwords,
                 EmailVerification verification, Clock clock) {
        this.properties = properties;
        this.throttle = throttle;
        this.accounts = accounts;
        this.passwords = passwords;
        this.verification = verification;
        this.clock = clock;
    }

    /** Throttled before the invite code is checked, so that the code cannot be guessed by brute force. */
    @Transactional
    UserEntity register(RegisterRequest request, String client) {
        throttle.admit(Action.REGISTRATION, client);
        properties.admit(request.inviteCode());
        String email = request.email().strip();
        if (accounts.isTakenByAnother(email, null)) {
            throw AccountProblems.emailTaken();
        }
        UserEntity account = accounts.saveWithUniqueEmail(new UserEntity(email, request.displayName().strip(),
                passwords.hash(request.password()), clock.instant()));
        verification.sendVerification(account);
        return account;
    }
}
