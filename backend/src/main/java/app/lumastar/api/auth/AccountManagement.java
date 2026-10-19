package app.lumastar.api.auth;

import app.lumastar.persistence.UserEntity;
import app.lumastar.persistence.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Display name, password and deletion of the signed-in account; password and deletion need the current password. */
@Service
class AccountManagement {

    private final UserRepository users;
    private final AccountService accounts;
    private final AccountMails mails;
    private final Passwords passwords;
    private final NewPassword newPassword;

    AccountManagement(UserRepository users, AccountService accounts, AccountMails mails, Passwords passwords,
                      NewPassword newPassword) {
        this.users = users;
        this.accounts = accounts;
        this.mails = mails;
        this.passwords = passwords;
        this.newPassword = newPassword;
    }

    @Transactional
    UserEntity rename(UUID userId, String displayName) {
        UserEntity account = accounts.lock(userId);
        account.rename(displayName.strip());
        return account;
    }

    /** See {@link NewPassword} for what else a new password ends. */
    @Transactional
    void changePassword(UUID userId, String currentPassword, String password, String client) {
        UserEntity account = accounts.lock(userId);
        passwords.requireCurrent(account, currentPassword, client);
        newPassword.set(account, password);
    }

    /**
     * Deletes the account with all its learner data: every learner table refers to {@code users} with
     * {@code ON DELETE CASCADE}. A verified address gets a confirmation.
     */
    @Transactional
    void delete(UUID userId, String password, String client) {
        UserEntity account = accounts.lock(userId);
        passwords.requireCurrent(account, password, client);
        if (account.isEmailVerified()) {
            mails.accountDeleted(account.getEmail(), account.getDisplayName());
        }
        users.delete(account);
    }
}
