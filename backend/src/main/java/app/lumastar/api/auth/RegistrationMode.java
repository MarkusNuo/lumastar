package app.lumastar.api.auth;

import app.lumastar.domain.Coded;
import com.fasterxml.jackson.annotation.JsonValue;

/** Who may create an account ({@code lumastar.registration.mode}). */
public enum RegistrationMode implements Coded {
    /** Everyone. */
    OPEN("open"),
    /** Whoever knows the invite code ({@code lumastar.registration.invite-code}). */
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
