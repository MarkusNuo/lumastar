package app.lingora.api.auth;

import app.lingora.persistence.AccountTokenPurpose;
import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Display name, password and deletion of the signed-in account; password and deletion need the current password. */
@Service
class AccountManagement {

    private final UserRepository users;
    private final AccountService accounts;
    private final AccountTokens tokens;
    private final AccountMails mails;
    private final Passwords passwords;

    AccountManagement(UserRepository users, AccountService accounts, AccountTokens tokens, AccountMails mails,
                      Passwords passwords) {
        this.users = users;
        this.accounts = accounts;
        this.tokens = tokens;
        this.mails = mails;
        this.passwords = passwords;
    }

    @Transactional
    UserEntity rename(UUID userId, String displayName) {
        UserEntity account = accounts.lock(userId);
        account.rename(displayName.strip());
        return account;
    }

    /** An open reset link stops working, since the learner evidently knows the password. */
    @Transactional
    void changePassword(UUID userId, String currentPassword, String newPassword, String client) {
        UserEntity account = accounts.lock(userId);
        passwords.requireCurrent(account, currentPassword, client);
        account.changePassword(passwords.hash(newPassword));
        tokens.revoke(userId, AccountTokenPurpose.RESET_PASSWORD);
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
