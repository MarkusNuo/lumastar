package app.lingora;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MockMvcTester.MockMvcRequestBuilder;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Calls the API like the browser SPA: it keeps the session and echoes the {@code XSRF-TOKEN} cookie in the
 * {@code X-XSRF-TOKEN} header. Every client has its own remote address, so login throttling never leaks between
 * tests.
 */
public final class SpaClient {

    public static final String CSRF_COOKIE = "XSRF-TOKEN";
    public static final String CSRF_HEADER = "X-XSRF-TOKEN";
    private static final AtomicInteger CLIENT_COUNT = new AtomicInteger();

    private final MockMvcTester mvc;
    private final String remoteAddress;
    private MockHttpSession session;
    private String csrfToken;

    public SpaClient(MockMvcTester mvc) {
        this.mvc = mvc;
        int client = CLIENT_COUNT.incrementAndGet();
        this.remoteAddress = "10.0.%d.%d".formatted(client / 250, client % 250 + 1);
    }

    public MvcTestResult get(String uri) {
        return exchange(mvc.get().uri(uri));
    }

    public MvcTestResult post(String uri, String json) {
        MockMvcRequestBuilder request = jsonPost(uri, json);
        if (csrfToken != null) {
            request.header(CSRF_HEADER, csrfToken);
        }
        return exchange(request);
    }

    public MvcTestResult postWithCsrfHeader(String uri, String json, String headerValue) {
        return exchange(jsonPost(uri, json).header(CSRF_HEADER, headerValue));
    }

    public MvcTestResult postWithoutCsrfHeader(String uri, String json) {
        return exchange(jsonPost(uri, json));
    }

    /** Opens a session before signing in, as a browser that already talked to the server would have. */
    public void openSession() {
        session = new MockHttpSession();
    }

    public String sessionId() {
        return session == null ? null : session.getId();
    }

    public String csrfToken() {
        return csrfToken;
    }

    public static List<String> setCookieHeaders(MvcTestResult result, String cookieName) {
        return result.getResponse().getHeaders(HttpHeaders.SET_COOKIE).stream()
                .filter(header -> header.startsWith(cookieName + "="))
                .toList();
    }

    private MockMvcRequestBuilder jsonPost(String uri, String json) {
        return mvc.post().uri(uri).contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private MvcTestResult exchange(MockMvcRequestBuilder request) {
        request.with(servletRequest -> {
            servletRequest.setRemoteAddr(remoteAddress);
            return servletRequest;
        });
        if (session != null) {
            request.session(session);
        }
        if (csrfToken != null) {
            request.cookie(new Cookie(CSRF_COOKIE, csrfToken));
        }
        MvcTestResult result = request.exchange();
        HttpSession current = result.getRequest().getSession(false);
        session = current instanceof MockHttpSession mockSession ? mockSession : null;
        List<String> csrfCookies = setCookieHeaders(result, CSRF_COOKIE);
        if (!csrfCookies.isEmpty()) {
            String value = csrfCookies.getLast().substring(CSRF_COOKIE.length() + 1).split(";", 2)[0];
            csrfToken = value.isEmpty() ? null : value;
        }
        return result;
    }
}
