package app.lingora.api.auth;

import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The accounts of this instance: the signed-in one, sign-in by e-mail and password (PRD F13, M8). */
@Service
public class AccountService {

    private static final String UNIQUE_EMAIL_INDEX = "users_email_key";

    private final UserRepository users;
    private final Passwords passwords;

    AccountService(UserRepository users, Passwords passwords) {
        this.users = users;
        this.passwords = passwords;
    }

    @Transactional(readOnly = true)
    public Optional<UserEntity> find(AuthenticatedUser principal) {
        return principal == null ? Optional.empty() : users.findById(principal.userId());
    }

    /** The signed-in account; a session whose account no longer exists counts as not signed in. */
    @Transactional(readOnly = true)
    public UserEntity current(AuthenticatedUser principal) {
        return find(principal).orElseThrow(AccountService::notSignedIn);
    }

    @Transactional(readOnly = true)
    boolean legacyLoginAvailable() {
        return users.existsByEmailIsNull();
    }

    /**
     * The account with this e-mail address and password. Without an address the account from before M8, which has
     * none yet, signs in. Every attempt counts against the {@link LoginThrottle} until it succeeds.
     */
    @Transactional(readOnly = true)
    UserEntity authenticate(String email, String password, String client) {
        Optional<UserEntity> account = email == null || email.isBlank()
                ? users.findFirstByEmailIsNullOrderByCreatedAtAsc()
                : users.findByEmail(email.strip());
        if (!passwords.matches(account, password, client)) {
            throw AccountProblems.invalidCredentials();
        }
        return account.orElseThrow();
    }

    /** The account row, locked until the end of the caller's transaction. */
    UserEntity lock(UUID userId) {
        return users.findForUpdateById(userId).orElseThrow(AccountService::notSignedIn);
    }

    /** Writes the account at once, so that two accounts claiming the same address at the same time end in a conflict. */
    UserEntity saveWithUniqueEmail(UserEntity account) {
        try {
            return users.saveAndFlush(account);
        } catch (DataIntegrityViolationException e) {
            if (String.valueOf(NestedExceptionUtils.getMostSpecificCause(e).getMessage()).contains(UNIQUE_EMAIL_INDEX)) {
                throw AccountProblems.emailTaken();
            }
            throw e;
        }
    }

    /** Whether another account than {@code account} signs in with this address. */
    boolean isTakenByAnother(String email, UUID account) {
        return users.findByEmail(email).filter(owner -> !owner.getId().equals(account)).isPresent();
    }

    private static AuthenticationCredentialsNotFoundException notSignedIn() {
        return new AuthenticationCredentialsNotFoundException("No signed-in account");
    }
}
