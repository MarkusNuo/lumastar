package app.lumastar;

import jakarta.mail.BodyPart;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/**
 * Catches the mails of the integration tests instead of sending them; the tests send them synchronously
 * ({@code lumastar.mail.async=false}), so a mail is here when the request that caused it has returned. Test addresses
 * are unique, so tests look up their mails by recipient; every test starts without mails.
 */
public final class MailCatcher extends JavaMailSenderImpl {

    private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

    private final List<SentMail> sent = new CopyOnWriteArrayList<>();
    private volatile boolean serverDown;

    /** A sent mail with its plain-text and HTML parts. */
    public record SentMail(String from, String to, String subject, String text, String html) {

        /** The token of the link in the mail. */
        public String token() {
            Matcher matcher = TOKEN.matcher(text);
            if (!matcher.find()) {
                throw new AssertionError("No link with a token in: " + text);
            }
            return matcher.group(1);
        }
    }

    public void clear() {
        sent.clear();
    }

    public List<SentMail> sentTo(String address) {
        return sent.stream().filter(mail -> mail.to().equalsIgnoreCase(address)).toList();
    }

    /** The only mail sent to the address. */
    public SentMail onlyMailTo(String address) {
        List<SentMail> mails = sentTo(address);
        if (mails.size() != 1) {
            throw new AssertionError("Expected one mail to %s, got %s".formatted(address, mails));
        }
        return mails.getFirst();
    }

    public SentMail lastMailTo(String address) {
        List<SentMail> mails = sentTo(address);
        if (mails.isEmpty()) {
            throw new AssertionError("No mail to " + address);
        }
        return mails.getLast();
    }

    /** Lets every send fail until {@link #serverUp}, like an unreachable SMTP server. */
    public void serverDown() {
        serverDown = true;
    }

    public void serverUp() {
        serverDown = false;
    }

    @Override
    protected void doSend(MimeMessage[] mimeMessages, Object[] originalMessages) {
        if (serverDown) {
            throw new MailSendException("SMTP server unreachable (test)");
        }
        for (MimeMessage message : mimeMessages) {
            sent.add(read(message));
        }
    }

    private static SentMail read(MimeMessage message) {
        try {
            message.saveChanges();
            StringBuilder text = new StringBuilder();
            StringBuilder html = new StringBuilder();
            collectBodies(message, text, html);
            return new SentMail(((InternetAddress) message.getFrom()[0]).toString(),
                    ((InternetAddress) message.getRecipients(Message.RecipientType.TO)[0]).getAddress(),
                    message.getSubject(), text.toString(), html.toString());
        } catch (MessagingException | IOException e) {
            throw new IllegalStateException("Unreadable mail", e);
        }
    }

    private static void collectBodies(Part part, StringBuilder text, StringBuilder html) throws MessagingException, IOException {
        if (part.isMimeType("text/plain")) {
            text.append(part.getContent());
        } else if (part.isMimeType("text/html")) {
            html.append(part.getContent());
        } else if (part.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                BodyPart body = multipart.getBodyPart(i);
                collectBodies(body, text, html);
            }
        }
    }
}
