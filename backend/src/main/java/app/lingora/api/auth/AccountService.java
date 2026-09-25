package app.lingora.api.auth;

import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.time.Clock;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The single account of this instance: first-start setup and password check (PRD F13). */
@Service
public class AccountService {

    // Serialises concurrent setup requests so that at most one account is ever created.
    private static final long ACCOUNT_SETUP_LOCK = 0x4c494e474f5241L;

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final LoginThrottle loginThrottle;
    private final PasswordCheckLimit passwordCheckLimit;
    private final JdbcClient jdbcClient;
    private final Clock clock;

    AccountService(UserRepository users, PasswordEncoder passwordEncoder, LoginThrottle loginThrottle,
                   PasswordCheckLimit passwordCheckLimit, JdbcClient jdbcClient, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.loginThrottle = loginThrottle;
        this.passwordCheckLimit = passwordCheckLimit;
        this.jdbcClient = jdbcClient;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public boolean isSetUp() {
        return users.count() > 0;
    }

    @Transactional(readOnly = true)
    public Optional<UserEntity> find(AuthenticatedUser principal) {
        return principal == null ? Optional.empty() : users.findById(principal.userId());
    }

    /** The signed-in account; a session whose account no longer exists counts as not signed in. */
    @Transactional(readOnly = true)
    public UserEntity current(AuthenticatedUser principal) {
        return find(principal).orElseThrow(() -> new AuthenticationCredentialsNotFoundException("No signed-in account"));
    }

    @Transactional
    UserEntity createAccount(String displayName, String password) {
        jdbcClient.sql("SELECT pg_advisory_xact_lock(:key)").param("key", ACCOUNT_SETUP_LOCK).query().listOfRows();
        if (users.count() > 0) {
            throw new AccountAlreadyExistsException();
        }
        return users.save(new UserEntity(displayName.strip(), passwordEncoder.encode(password), clock.instant()));
    }

    /** The attempt is counted as failed before the password is checked (see {@link LoginThrottle}). */
    @Transactional(readOnly = true)
    UserEntity authenticate(String password, String client) {
        Optional<UserEntity> account = users.findFirstByOrderByCreatedAtAsc();
        UUID accountId = account.map(UserEntity::getId).orElse(null);
        boolean matches = passwordCheckLimit.check(() -> {
            loginThrottle.admit(client, accountId);
            return account.filter(user -> passwordEncoder.matches(password, user.getPasswordHash())).isPresent();
        });
        if (!matches) {
            throw new InvalidCredentialsException();
        }
        loginThrottle.recordSuccess(client, accountId);
        return account.get();
    }
}
