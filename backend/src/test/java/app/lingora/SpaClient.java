package app.lingora;

import jakarta.servlet.http.Cookie;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MockMvcTester.MockMvcRequestBuilder;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Calls the API like the browser SPA: it keeps the cookies (the session cookie and {@code XSRF-TOKEN}) and echoes the
 * CSRF token in the {@code X-XSRF-TOKEN} header. Every client has its own remote address, so login throttling never
 * leaks between tests.
 */
public final class SpaClient {

    public static final String SESSION_COOKIE = "LINGORA_SESSION";
    public static final String CSRF_COOKIE = "XSRF-TOKEN";
    public static final String CSRF_HEADER = "X-XSRF-TOKEN";
    private static final AtomicInteger CLIENT_COUNT = new AtomicInteger();

    private final MockMvcTester mvc;
    private final String remoteAddress;
    private final Map<String, String> cookies = new LinkedHashMap<>();

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
        if (csrfToken() != null) {
            request.header(CSRF_HEADER, csrfToken());
        }
        return exchange(request);
    }

    public MvcTestResult postWithCsrfHeader(String uri, String json, String headerValue) {
        return exchange(jsonPost(uri, json).header(CSRF_HEADER, headerValue));
    }

    public MvcTestResult postWithoutCsrfHeader(String uri, String json) {
        return exchange(jsonPost(uri, json));
    }

    /** Continues a session of another client, as a browser holding that session cookie would. */
    public void useSession(String sessionCookie) {
        cookies.put(SESSION_COOKIE, sessionCookie);
    }

    public String sessionCookie() {
        return cookies.get(SESSION_COOKIE);
    }

    public String csrfToken() {
        return cookies.get(CSRF_COOKIE);
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
        if (!cookies.isEmpty()) {
            request.cookie(cookies.entrySet().stream().map(cookie -> new Cookie(cookie.getKey(), cookie.getValue()))
                    .toArray(Cookie[]::new));
        }
        MvcTestResult result = request.exchange();
        for (String name : List.of(SESSION_COOKIE, CSRF_COOKIE)) {
            List<String> updates = setCookieHeaders(result, name);
            if (!updates.isEmpty()) {
                String value = updates.getLast().substring(name.length() + 1).split(";", 2)[0];
                if (value.isEmpty()) {
                    cookies.remove(name);
                } else {
                    cookies.put(name, value);
                }
            }
        }
        return result;
    }
}
