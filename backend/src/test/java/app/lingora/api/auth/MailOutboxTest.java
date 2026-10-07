package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.MailCatcher;
import app.lingora.MailCatcher.SentMail;
import jakarta.mail.internet.AddressException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;

class MailOutboxTest {

    private static final String FROM = "Lingora <noreply@lingora.example>";
    private static final String TO = "erza@example.com";

    private final MailCatcher catcher = new MailCatcher();

    @AfterEach
    void endTransaction() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void sendsInTheBackgroundInOrderAndDeliversQueuedMailsOnShutdown() throws Exception {
        MailOutbox outbox = new MailOutbox(catcher, new MailProperties(FROM, true));

        for (int i = 1; i <= 3; i++) {
            outbox.sendAfterCommit(mail("Mail " + i));
        }
        outbox.destroy();

        assertThat(catcher.sentTo(TO)).extracting(SentMail::subject).containsExactly("Mail 1", "Mail 2", "Mail 3");
    }

    @Test
    void sendsOnlyOnceTheTransactionHasCommitted() throws Exception {
        MailOutbox outbox = new MailOutbox(catcher, new MailProperties(FROM, false));
        TransactionSynchronizationManager.initSynchronization();

        outbox.sendAfterCommit(mail("Willkommen"));

        assertThat(catcher.sentTo(TO)).isEmpty();
        TransactionSynchronizationUtils.triggerAfterCommit();
        assertThat(catcher.onlyMailTo(TO).subject()).isEqualTo("Willkommen");
    }

    @Test
    void sendsNothingForATransactionThatRolledBack() throws Exception {
        MailOutbox outbox = new MailOutbox(catcher, new MailProperties(FROM, false));
        TransactionSynchronizationManager.initSynchronization();

        outbox.sendAfterCommit(mail("Willkommen"));
        TransactionSynchronizationUtils.invokeAfterCompletion(TransactionSynchronizationManager.getSynchronizations(),
                TransactionSynchronization.STATUS_ROLLED_BACK);

        assertThat(catcher.sentTo(TO)).isEmpty();
    }

    @Test
    void dropsAMailTheServerDoesNotTakeWithoutFailingTheCaller() throws Exception {
        MailOutbox outbox = new MailOutbox(catcher, new MailProperties(FROM, false));
        catcher.serverDown();

        assertThatNoException().isThrownBy(() -> outbox.sendAfterCommit(mail("Verloren")));

        catcher.serverUp();
        outbox.sendAfterCommit(mail("Angekommen"));
        assertThat(catcher.sentTo(TO)).extracting(SentMail::subject).containsExactly("Angekommen");
    }

    @Test
    void sendsBothTheTextAndTheHtmlVersionFromTheConfiguredSender() throws Exception {
        MailOutbox outbox = new MailOutbox(catcher, new MailProperties(FROM, false));

        outbox.sendAfterCommit(new OutgoingMail(TO, "Grüsse", "Hallo Erza", "<p>Hallo Erza</p>"));

        assertThat(catcher.onlyMailTo(TO)).isEqualTo(new SentMail(FROM, TO, "Grüsse", "Hallo Erza", "<p>Hallo Erza</p>"));
    }

    @Test
    void rejectsAnInvalidSenderAtStartup() {
        assertThatThrownBy(() -> new MailOutbox(catcher, new MailProperties("Lingora <noreply@", false)))
                .isInstanceOf(AddressException.class);
    }

    private static OutgoingMail mail(String subject) {
        return new OutgoingMail(TO, subject, "Text", "<p>Text</p>");
    }
}
