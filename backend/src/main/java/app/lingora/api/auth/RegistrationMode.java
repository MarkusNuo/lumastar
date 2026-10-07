package app.lingora.api.auth;

import app.lingora.domain.Coded;
import com.fasterxml.jackson.annotation.JsonValue;

/** Who may create an account ({@code lingora.registration.mode}). */
public enum RegistrationMode implements Coded {
    /** Everyone. */
    OPEN("open"),
    /** Whoever knows the invite code ({@code lingora.registration.invite-code}). */
    INVITE("invite"),
    /** Nobody; existing accounts keep working. */
    CLOSED("closed");

    private final String code;

    RegistrationMode(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
