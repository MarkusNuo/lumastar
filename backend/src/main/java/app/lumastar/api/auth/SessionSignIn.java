package app.lumastar.api.auth;

import app.lumastar.persistence.UserEntity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.stereotype.Component;

/**
 * Establishes and ends the session login. The API has no Spring Security login filter, so this does its work:
 * a new session id against session fixation, a fresh CSRF token and the security context stored in the session.
 */
@Component
class SessionSignIn {

    private static final String LEARNER_ROLE = "ROLE_LEARNER";

    private final SecurityContextHolderStrategy contextHolder = SecurityContextHolder.getContextHolderStrategy();
    private final ChangeSessionIdAuthenticationStrategy sessionFixationProtection = new ChangeSessionIdAuthenticationStrategy();
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();
    private final CsrfAuthenticationStrategy csrfRotation;
    private final SecurityContextRepository contextRepository;

    SessionSignIn(CsrfTokenRepository csrfTokenRepository, SecurityContextRepository contextRepository) {
        this.csrfRotation = new CsrfAuthenticationStrategy(csrfTokenRepository);
        this.contextRepository = contextRepository;
    }

    void signIn(UserEntity user, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                new AuthenticatedUser(user.getId()), null, List.of(new SimpleGrantedAuthority(LEARNER_ROLE)));
        sessionFixationProtection.onAuthentication(authentication, request, response);
        rotateCsrfToken(authentication, request, response);
        SecurityContext context = contextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        contextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
    }

    void signOut(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        logoutHandler.logout(request, response, authentication);
        rotateCsrfToken(authentication, request, response);
    }

    /** Replaces the CSRF token and sends the new cookie immediately, so the SPA can continue without a reload. */
    private void rotateCsrfToken(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        csrfRotation.onAuthentication(authentication, request, response);
        if (request.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
            token.getToken();
        }
    }
}
