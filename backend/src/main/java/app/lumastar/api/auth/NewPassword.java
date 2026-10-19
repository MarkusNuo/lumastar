package app.lumastar.api.auth;

import app.lumastar.persistence.AccountTokenPurpose;
import app.lumastar.persistence.UserEntity;
import org.springframework.stereotype.Component;

/**
 * Sets a new password, whether by the current one or by a reset link. Whoever does it controls the account from now on,
 * and whoever knew the old password may have started a change of the sign-in address: an open reset link and a pending
 * e-mail change stop working, and a verified address is told. The caller ends the other sessions.
 */
@Component
class NewPassword {

    private final Passwords passwords;
    private final AccountTokens tokens;
    private final AccountMails mails;

    NewPassword(Passwords passwords, AccountTokens tokens, AccountMails mails) {
        this.passwords = passwords;
        this.tokens = tokens;
        this.mails = mails;
    }

    /** Within the caller's transaction, on the locked account. */
    void set(UserEntity account, String newPassword) {
        account.changePassword(passwords.hash(newPassword));
        boolean emailChangeCancelled = account.getPendingEmail() != null;
        account.cancelEmailChange();
        tokens.revoke(account.getId(), AccountTokenPurpose.CHANGE_EMAIL);
        tokens.revoke(account.getId(), AccountTokenPurpose.RESET_PASSWORD);
        if (account.isEmailVerified()) {
            mails.passwordChanged(account.getEmail(), account.getDisplayName(), emailChangeCancelled);
        }
    }
}
