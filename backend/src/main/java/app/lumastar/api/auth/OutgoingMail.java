package app.lumastar.api.auth;

/** A mail with a plain-text and an HTML version of the same content. */
record OutgoingMail(String to, String subject, String text, String html) {

    @Override
    public String toString() {
        return "OutgoingMail[subject=" + subject + "]";
    }
}
