package app.lingora.api.auth;

import app.lingora.api.auth.RequestThrottle.Action;
import app.lingora.persistence.AccountTokenPurpose;
import app.lingora.persistence.AccountTokenStore.StoredToken;
import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Passwort vergessen": a reset link goes only to a verified address (DECISIONS #78), since an unverified one may
 * belong to someone else. The request never reveals whether an account has the address.
 */
@Service
class PasswordReset {

    private final UserRepository users;
    private final AccountService accounts;
    private final AccountTokens tokens;
    private final AccountMails mails;
    private final Passwords passwords;
    private final RequestThrottle throttle;

    PasswordReset(UserRepository users, AccountService accounts, AccountTokens tokens, AccountMails mails,
                  Passwords passwords, RequestThrottle throttle) {
        this.users = users;
        this.accounts = accounts;
        this.tokens = tokens;
        this.mails = mails;
        this.passwords = passwords;
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
     * Sets the new password; the link works only while the account still has the address it was sent to.
     *
     * @return the account, whose other sessions the caller ends
     */
    @Transactional
    UUID confirm(String token, String newPassword) {
        StoredToken link = tokens.redeem(token, AccountTokenPurpose.RESET_PASSWORD);
        UserEntity account = accounts.lock(link.userId());
        if (!account.hasEmail(link.email()) || !account.isEmailVerified()) {
            throw AccountProblems.tokenInvalid();
        }
        account.changePassword(passwords.hash(newPassword));
        passwords.forgetFailures(account);
        return account.getId();
    }
}
