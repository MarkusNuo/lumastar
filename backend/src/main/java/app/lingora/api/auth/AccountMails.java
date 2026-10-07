package app.lingora.api.auth;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/**
 * The German account mails (Swiss orthography), each as plain text and simple HTML in the colours of the app. Links
 * lead to the pages of the web app below {@code lingora.public-url}, which pass the token on to the API.
 */
@Component
class AccountMails {

    private static final String VERIFY_EMAIL_PAGE = "/verify-email";
    private static final String RESET_PASSWORD_PAGE = "/reset-password";

    private final MailOutbox outbox;
    private final String publicUrl;

    AccountMails(MailOutbox outbox, @Value("${lingora.public-url}") URI publicUrl) {
        this.outbox = outbox;
        this.publicUrl = publicUrl.toString().replaceAll("/+$", "");
    }

    private record Link(String label, String url) {
    }

    void verifyEmail(String to, String displayName, String token) {
        send(to, "Bitte bestätige deine E-Mail-Adresse", displayName,
                "Bitte bestätige die E-Mail-Adresse deines Lingora-Kontos. Damit kannst du dein Passwort zurücksetzen, "
                        + "falls du es einmal vergisst.",
                new Link("E-Mail-Adresse bestätigen", link(VERIFY_EMAIL_PAGE, token)),
                "Der Link ist 48 Stunden gültig. Hast du kein Lingora-Konto angelegt, kannst du diese E-Mail ignorieren.");
    }

    void confirmEmailChange(String to, String displayName, String token) {
        send(to, "Bestätige deine neue E-Mail-Adresse", displayName,
                "Du möchtest die E-Mail-Adresse deines Lingora-Kontos ändern. Bestätige die neue Adresse mit diesem Link.",
                new Link("Neue Adresse bestätigen", link(VERIFY_EMAIL_PAGE, token)),
                "Der Link ist 48 Stunden gültig. Bis dahin meldest du dich weiter mit deiner bisherigen Adresse an. "
                        + "Hast du die Änderung nicht angefordert, kannst du diese E-Mail ignorieren.");
    }

    void resetPassword(String to, String displayName, String token) {
        send(to, "Neues Passwort für Lingora", displayName,
                "Du hast ein neues Passwort für dein Lingora-Konto angefordert. Wähle es über diesen Link.",
                new Link("Neues Passwort wählen", link(RESET_PASSWORD_PAGE, token)),
                "Der Link ist 1 Stunde gültig und funktioniert nur einmal. Hast du kein neues Passwort angefordert, "
                        + "ignoriere diese E-Mail; dein Passwort bleibt unverändert.");
    }

    void accountDeleted(String to, String displayName) {
        send(to, "Dein Lingora-Konto wurde gelöscht", displayName,
                "Dein Lingora-Konto und alle deine Lerndaten sind gelöscht. Schön, dass du mit Lingora gelernt hast.",
                null,
                "Du kannst jederzeit wieder ein neues Konto anlegen.");
    }

    private String link(String page, String token) {
        return publicUrl + page + "?token=" + token;
    }

    private void send(String to, String subject, String displayName, String intro, Link link, String outro) {
        outbox.sendAfterCommit(new OutgoingMail(to, subject, text(displayName, intro, link, outro),
                html(subject, displayName, intro, link, outro)));
    }

    private static String text(String displayName, String intro, Link link, String outro) {
        String action = link == null ? "" : link.url() + "\n\n";
        return "Hallo %s\n\n%s\n\n%s%s\n\nLingora\n".formatted(displayName, intro, action, outro);
    }

    private static String html(String subject, String displayName, String intro, Link link, String outro) {
        String action = link == null ? "" : """
                <p style="margin:28px 0"><a href="%1$s" style="background:#7e54ff;color:#ffffff;text-decoration:none;\
                font-weight:bold;padding:14px 22px;border-radius:12px;display:inline-block">%2$s</a></p>
                <p style="font-size:13px;color:#9fb0ba">Falls der Knopf nicht funktioniert, öffne diesen Link:<br>\
                <a href="%1$s" style="color:#b9a0ff;word-break:break-all">%1$s</a></p>
                """.formatted(escape(link.url()), escape(link.label()));
        return """
                <!DOCTYPE html>
                <html lang="de">
                <head><meta charset="utf-8"><title>%s</title></head>
                <body style="margin:0;padding:24px;background:#131f24;font-family:Arial,Helvetica,sans-serif;\
                color:#e8eef1;font-size:16px;line-height:1.5">
                <div style="max-width:520px;margin:0 auto;background:#1c2b33;border-radius:16px;padding:32px">
                <p style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#b9a0ff">Lingora</p>
                <p>Hallo %s</p>
                <p>%s</p>
                %s<p>%s</p>
                </div>
                </body>
                </html>
                """.formatted(escape(subject), escape(displayName), escape(intro), action, escape(outro));
    }

    private static String escape(String text) {
        return HtmlUtils.htmlEscape(text, "UTF-8");
    }
}
