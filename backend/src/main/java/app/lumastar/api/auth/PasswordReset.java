package app.lumastar.api.auth;

import app.lumastar.api.auth.RequestThrottle.Action;
import app.lumastar.persistence.AccountTokenPurpose;
import app.lumastar.persistence.AccountTokenStore.StoredToken;
import app.lumastar.persistence.UserEntity;
import app.lumastar.persistence.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Passwort vergessen": a reset link goes only to a verified address, since an unverified one may
 * belong to someone else. The request never reveals whether an account has the address.
 */
@Service
class PasswordReset {

    private final UserRepository users;
    private final AccountService accounts;
    private final AccountTokens tokens;
    private final AccountMails mails;
    private final Passwords passwords;
    private final NewPassword newPassword;
    private final RequestThrottle throttle;

    PasswordReset(UserRepository users, AccountService accounts, AccountTokens tokens, AccountMails mails,
                  Passwords passwords, NewPassword newPassword, RequestThrottle throttle) {
        this.users = users;
        this.accounts = accounts;
        this.tokens = tokens;
        this.mails = mails;
        this.passwords = passwords;
        this.newPassword = newPassword;
        this.throttle = throttle;
    }

    @Transactional
    void request(String email, String client) {
        String address = email.strip();
        throttle.admit(Action.PASSWORD_RESET, client);
        throttle.admit(Action.PASSWORD_RESET_FOR_EMAIL, address);
        users.findByEmail(address).filter(UserEntity::isEmailVerified).ifPresent(account -> mails.resetPassword(
                account.getEmail(), account.getDisplayName(),
                tokens.issue(account.getId(), AccountTokenPurpose.RESET_PASSWORD, account.getEmail())));
    }

    /**
     * Sets the new password ({@link NewPassword}); the link works only while the account still has the address it was
     * sent to.
     *
     * @return the account, whose other sessions the caller ends
     */
    @Transactional
    UUID confirm(String token, String password) {
        StoredToken link = tokens.redeem(token, AccountTokenPurpose.RESET_PASSWORD);
        UserEntity account = accounts.lock(link.userId());
        if (!account.hasEmail(link.email()) || !account.isEmailVerified()) {
            throw AccountProblems.tokenInvalid();
        }
        newPassword.set(account, password);
        passwords.forgetFailures(account);
        return account.getId();
    }
}
