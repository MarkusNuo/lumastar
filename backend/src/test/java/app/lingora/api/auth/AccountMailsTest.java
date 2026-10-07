package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.MailCatcher;
import app.lingora.MailCatcher.SentMail;
import jakarta.mail.internet.AddressException;
import java.net.URI;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The German account mails (Swiss orthography) with their links, as plain text and HTML. */
class AccountMailsTest {

    private static final String TO = "erza@example.com";
    private static final String TOKEN = "Abc_123-xyzAbc_123-xyzAbc_123-xyzAbc_123-xy";

    private final MailCatcher catcher = new MailCatcher();
    private final AccountMails mails;

    AccountMailsTest() throws AddressException {
        MailOutbox outbox = new MailOutbox(catcher, new MailProperties("Lingora <noreply@lingora.example>", false));
        mails = new AccountMails(outbox, URI.create("https://lingora.example/app/"));
    }

    @Test
    void theVerificationMailLinksToTheVerificationPage() {
        mails.verifyEmail(TO, "Erza", TOKEN);

        SentMail mail = catcher.onlyMailTo(TO);
        assertThat(mail.from()).isEqualTo("Lingora <noreply@lingora.example>");
        assertThat(mail.subject()).isEqualTo("Bitte bestätige deine E-Mail-Adresse");
        assertThat(mail.text()).isEqualTo("""
                Hallo Erza

                Bitte bestätige die E-Mail-Adresse deines Lingora-Kontos. Damit kannst du dein Passwort zurücksetzen, \
                falls du es einmal vergisst.

                https://lingora.example/app/verify-email?token=%s

                Der Link ist 48 Stunden gültig. Hast du kein Lingora-Konto angelegt, kannst du diese E-Mail ignorieren.

                Lingora
                """.formatted(TOKEN));
        assertThat(mail.token()).isEqualTo(TOKEN);
        assertThat(mail.html()).contains("<html lang=\"de\">", "Hallo Erza",
                "<a href=\"https://lingora.example/app/verify-email?token=%s\"".formatted(TOKEN), "E-Mail-Adresse bestätigen");
    }

    @Test
    void theEmailChangeMailLinksToTheVerificationPageToo() {
        mails.confirmEmailChange(TO, "Erza", TOKEN);

        SentMail mail = catcher.onlyMailTo(TO);
        assertThat(mail.subject()).isEqualTo("Bestätige deine neue E-Mail-Adresse");
        assertThat(mail.text()).contains("https://lingora.example/app/verify-email?token=" + TOKEN, "48 Stunden",
                "bisherigen Adresse");
    }

    @Test
    void theResetMailLinksToTheResetPageAndSaysHowLongItIsValid() {
        mails.resetPassword(TO, "Erza", TOKEN);

        SentMail mail = catcher.onlyMailTo(TO);
        assertThat(mail.subject()).isEqualTo("Neues Passwort für Lingora");
        assertThat(mail.text()).contains("https://lingora.example/app/reset-password?token=" + TOKEN,
                "1 Stunde gültig und funktioniert nur einmal", "dein Passwort bleibt unverändert");
        assertThat(mail.html()).contains("Neues Passwort wählen");
    }

    @Test
    void theDeletionMailHasNoLink() {
        mails.accountDeleted(TO, "Erza");

        SentMail mail = catcher.onlyMailTo(TO);
        assertThat(mail.subject()).isEqualTo("Dein Lingora-Konto wurde gelöscht");
        assertThat(mail.text()).contains("alle deine Lerndaten sind gelöscht").doesNotContain("http");
        assertThat(mail.html()).doesNotContain("<a ");
    }

    @Test
    void theNoticeOfAnEmailChangeNamesTheNewAddressAndHowToStopIt() {
        mails.emailChangeRequested(TO, "Erza", "<neu>@example.com");

        SentMail mail = catcher.onlyMailTo(TO);
        assertThat(mail.subject()).isEqualTo("Deine E-Mail-Adresse soll geändert werden");
        assertThat(mail.text()).contains("neue E-Mail-Adresse <neu>@example.com angegeben",
                "Falls du das nicht warst, setze sofort ein neues Passwort", "«Passwort vergessen»",
                "Damit wird die Änderung abgebrochen.").doesNotContain("http");
        assertThat(mail.html()).contains("&lt;neu&gt;@example.com").doesNotContain("<a ");
    }

    @Test
    void theNoticeOfANewPasswordSaysWhetherAnEmailChangeWasCancelled() {
        mails.passwordChanged(TO, "Erza", false);
        mails.passwordChanged(TO, "Erza", true);

        List<SentMail> sent = catcher.sentTo(TO);
        assertThat(sent).extracting(SentMail::subject).containsOnly("Dein Lingora-Passwort wurde geändert");
        assertThat(sent.getFirst().text()).contains("Auf deinen anderen Geräten bist du abgemeldet.",
                "Falls du das nicht warst").doesNotContain("abgebrochen", "http");
        assertThat(sent.getLast().text()).contains("Die angefangene Änderung deiner E-Mail-Adresse ist abgebrochen");
    }

    @Test
    void usesSwissOrthography() {
        mails.verifyEmail(TO, "Erza", TOKEN);
        mails.confirmEmailChange(TO, "Erza", TOKEN);
        mails.resetPassword(TO, "Erza", TOKEN);
        mails.accountDeleted(TO, "Erza");
        mails.emailChangeRequested(TO, "Erza", "neu@example.com");
        mails.passwordChanged(TO, "Erza", true);

        List<SentMail> sent = catcher.sentTo(TO);
        assertThat(sent).hasSize(6).allSatisfy(mail -> {
            assertThat(mail.subject()).doesNotContain("ß");
            assertThat(mail.text()).doesNotContain("ß");
            assertThat(mail.html()).doesNotContain("ß");
        });
    }

    @Test
    void escapesTheDisplayNameInTheHtmlVersion() {
        mails.verifyEmail(TO, "<b>Erza</b> & Co", TOKEN);

        SentMail mail = catcher.onlyMailTo(TO);
        assertThat(mail.html()).contains("Hallo &lt;b&gt;Erza&lt;/b&gt; &amp; Co").doesNotContain("<b>");
        assertThat(mail.text()).startsWith("Hallo <b>Erza</b> & Co\n");
    }
}
