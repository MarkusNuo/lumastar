package app.lumastar.api.auth;

import java.io.Serializable;
import java.util.UUID;
import org.springframework.security.core.AuthenticatedPrincipal;

/** Principal stored in the HTTP session after sign-in. */
public record AuthenticatedUser(UUID userId) implements AuthenticatedPrincipal, Serializable {

    /** Spring Session indexes the sessions by this name, so that all sessions of an account can be ended at once. */
    @Override
    public String getName() {
        return userId.toString();
    }
}
