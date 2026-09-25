package app.lingora.api.auth;

import java.io.Serializable;
import java.util.UUID;

/** Principal stored in the HTTP session after sign-in. */
public record AuthenticatedUser(UUID userId) implements Serializable {
}
