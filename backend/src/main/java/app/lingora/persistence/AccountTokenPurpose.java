package app.lingora.persistence;

import app.lingora.domain.Coded;
import java.time.Duration;

/** What the link of an account mail does (table {@code account_tokens}), and how long it stays valid. */
public enum AccountTokenPurpose implements Coded {
    VERIFY_EMAIL("verify_email", Duration.ofHours(48)),
    CHANGE_EMAIL("change_email", Duration.ofHours(48)),
    RESET_PASSWORD("reset_password", Duration.ofHours(1));

    private final String code;
    private final Duration validity;

    AccountTokenPurpose(String code, Duration validity) {
        this.code = code;
        this.validity = validity;
    }

    @Override
    public String code() {
        return code;
    }

    public Duration validity() {
        return validity;
    }
}
