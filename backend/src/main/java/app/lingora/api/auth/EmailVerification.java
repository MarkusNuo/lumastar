package app.lingora.api.auth;

import app.lingora.api.auth.RequestThrottle.Action;
import app.lingora.persistence.AccountTokenPurpose;
import app.lingora.persistence.AccountTokenStore.StoredToken;
import app.lingora.persistence.UserEntity;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The sign-in address of an account: verifying it, adding one to an account from before M8 and changing it. A verified
 * address is replaced only once the new one is confirmed by the link sent to it ({@link UserEntity#changeEmail}).
 */
@Service
class EmailVerification {

    private final AccountService accounts;
    private final AccountTokens tokens;
    private final AccountMails mails;
    private final Passwords passwords;
    private final RequestThrottle throttle;
    private final Clock clock;

    EmailVerification(AccountService accounts, AccountTokens tokens, AccountMails mails, Passwords passwords,
                      RequestThrottle throttle, Clock clock) {
        this.accounts = accounts;
        this.tokens = tokens;
        this.mails = mails;
        this.passwords = passwords;
        this.throttle = throttle;
        this.clock = clock;
    }

    /** Within the caller's transaction: mails the link that verifies the current address of the account. */
    void sendVerification(UserEntity account) {
        String token = tokens.issue(account.getId(), AccountTokenPurpose.VERIFY_EMAIL, account.getEmail());
        mails.verifyEmail(account.getEmail(), account.getDisplayName(), token);
    }

    /** Sends the link of a pending change again, or else the one verifying the current address. */
    @Transactional
    void resend(UUID userId) {
        UserEntity account = accounts.lock(userId);
        if (account.getPendingEmail() == null && account.isEmailRequired()) {
            throw AccountProblems.emailRequired();
        }
        if (account.getPendingEmail() == null && account.isEmailVerified()) {
            throw AccountProblems.emailAlreadyVerified();
        }
        throttle.admit(Action.ACCOUNT_MAIL, userId.toString());
        if (account.getPendingEmail() != null) {
            sendChangeConfirmation(account);
        } else {
            sendVerification(account);
        }
    }

    /**
     * Changes the sign-in address after checking the password. The current address entered again cancels a pending
     * change.
     */
    @Transactional
    UserEntity change(UUID userId, String newEmail, String password, String client) {
        UserEntity account = accounts.lock(userId);
        passwords.requireCurrent(account, password, client);
        String email = newEmail.strip();
        if (account.hasEmail(email)) {
            account.cancelEmailChange();
            tokens.revoke(userId, AccountTokenPurpose.CHANGE_EMAIL);
            return account;
        }
        if (accounts.isTakenByAnother(email, userId)) {
            throw AccountProblems.emailTaken();
        }
        throttle.admit(Action.ACCOUNT_MAIL, userId.toString());
        if (account.changeEmail(email)) {
            sendChangeConfirmation(account);
        } else {
            tokens.revoke(userId, AccountTokenPurpose.CHANGE_EMAIL);
            sendVerification(account);
        }
        return accounts.saveWithUniqueEmail(account);
    }

    /** Opens the link of a verification or e-mail change mail; it works only while the account has that address. */
    @Transactional
    void verify(String token) {
        StoredToken link = tokens.redeem(token, AccountTokenPurpose.VERIFY_EMAIL, AccountTokenPurpose.CHANGE_EMAIL);
        UserEntity account = accounts.lock(link.userId());
        if (link.purpose() == AccountTokenPurpose.VERIFY_EMAIL && account.hasEmail(link.email())) {
            account.verifyEmail(clock.instant());
        } else if (link.purpose() == AccountTokenPurpose.CHANGE_EMAIL && account.hasPendingEmail(link.email())) {
            if (accounts.isTakenByAnother(link.email(), account.getId())) {
                throw AccountProblems.emailTaken();
            }
            account.confirmEmailChange(clock.instant());
            accounts.saveWithUniqueEmail(account);
        } else {
            throw AccountProblems.tokenInvalid();
        }
    }

    private void sendChangeConfirmation(UserEntity account) {
        String token = tokens.issue(account.getId(), AccountTokenPurpose.CHANGE_EMAIL, account.getPendingEmail());
        mails.confirmEmailChange(account.getPendingEmail(), account.getDisplayName(), token);
    }
}
