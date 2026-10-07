package app.lingora.api.auth;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Sends account mails after the transaction that caused them has committed, so that no mail announces a change that
 * was rolled back. A single background thread sends them one after another: a slow or unreachable SMTP server never
 * delays a request, and the response time does not reveal whether a mail was sent (no account enumeration by password
 * reset). A mail that cannot be sent is logged and dropped; the learner can request it again.
 */
@Component
class MailOutbox implements DisposableBean {

    private static final Logger LOG = LoggerFactory.getLogger(MailOutbox.class);
    private static final long SHUTDOWN_GRACE_SECONDS = 10;

    private final JavaMailSender sender;
    private final InternetAddress from;
    private final ExecutorService worker;

    MailOutbox(JavaMailSender sender, MailProperties properties) throws AddressException {
        this.sender = sender;
        this.from = new InternetAddress(properties.from(), true);
        this.worker = properties.async()
                ? Executors.newSingleThreadExecutor(Thread.ofPlatform().name("mail-outbox").daemon().factory())
                : null;
    }

    /** Sends the mail once the current transaction has committed, or right away outside a transaction. */
    void sendAfterCommit(OutgoingMail mail) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    dispatch(mail);
                }
            });
        } else {
            dispatch(mail);
        }
    }

    private void dispatch(OutgoingMail mail) {
        if (worker == null) {
            send(mail);
        } else {
            worker.execute(() -> send(mail));
        }
    }

    private void send(OutgoingMail mail) {
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(mail.to());
            helper.setSubject(mail.subject());
            helper.setText(mail.text(), mail.html());
            sender.send(message);
        } catch (MessagingException | RuntimeException e) {
            LOG.warn("Could not send the mail \"{}\"", mail.subject(), e);
        }
    }

    /** Mails queued before the shutdown still go out, within a grace period. */
    @Override
    public void destroy() throws InterruptedException {
        if (worker != null) {
            worker.shutdown();
            if (!worker.awaitTermination(SHUTDOWN_GRACE_SECONDS, TimeUnit.SECONDS)) {
                LOG.warn("{} account mails were not sent before the shutdown", worker.shutdownNow().size());
            }
        }
    }
}
