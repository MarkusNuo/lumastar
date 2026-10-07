package app.lingora.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

/**
 * The HTTP sessions of an account in Spring Session JDBC, found by the principal name ({@link AuthenticatedUser#getName}).
 * A new or reset password, a change of the sign-in address and the deletion of the account end them, so that a stolen
 * session stops working.
 */
@Component
class UserSessions {

    private final FindByIndexNameSessionRepository<? extends Session> sessions;

    UserSessions(FindByIndexNameSessionRepository<? extends Session> sessions) {
        this.sessions = sessions;
    }

    /** Ends every session of the account except the one of this request. */
    void endOthers(UUID userId, HttpServletRequest request) {
        HttpSession current = request.getSession(false);
        String keep = current == null ? null : current.getId();
        sessions.findByPrincipalName(userId.toString()).keySet().stream()
                .filter(id -> !id.equals(keep))
                .forEach(sessions::deleteById);
    }
}
