package app.lumastar.api.auth;

/** Limits of the account fields, shared by the request records (and by the database checks of V1 and V10). */
final class AccountConstraints {

    static final int EMAIL_MAX = 254;
    /** Bean Validation's {@code @Email} accepts addresses without a dot in the domain; sign-in addresses need one. */
    static final String EMAIL_PATTERN = "[^@\\s]+@[^@\\s]+\\.[^@\\s]+";
    static final int PASSWORD_MIN = 8;
    static final int PASSWORD_MAX = 128;
    static final int DISPLAY_NAME_MAX = 40;
    /** Written so that JavaScript validators of the generated client understand it as well. */
    static final String NO_CONTROL_CHARACTERS = "[^\\x00-\\x1F\\x7F]*";

    private AccountConstraints() {
    }
}
