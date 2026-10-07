package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;

/** The session cookie is written by the servlet container, so this test talks to the real server over HTTP. */
class SessionCookieTest extends IntegrationTest {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();

    @BeforeEach
    void freshInstance() {
        jdbc.sql("DELETE FROM users").update();
    }

    @Test
    void csrfCookieIsReadableByTheSpaAndSameSiteLax() throws IOException, InterruptedException {
        HttpResponse<String> status = http.send(HttpRequest.newBuilder(uri("/api/auth/status")).build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(status.headers().allValues("Set-Cookie")).filteredOn(cookie -> cookie.startsWith("XSRF-TOKEN="))
                .singleElement().asString()
                .contains("SameSite=Lax", "Path=/")
                .doesNotContain("HttpOnly");
    }

    @Test
    void sessionCookieIsHttpOnlyAndSameSiteLax() throws IOException, InterruptedException {
        HttpResponse<String> status = http.send(HttpRequest.newBuilder(uri("/api/auth/status")).build(),
                HttpResponse.BodyHandlers.ofString());
        String csrfToken = cookieValue(status.headers().allValues("Set-Cookie"), "XSRF-TOKEN");

        HttpResponse<String> registration = http.send(HttpRequest.newBuilder(uri("/api/auth/register"))
                        .header("Content-Type", "application/json")
                        .header("Cookie", "XSRF-TOKEN=" + csrfToken)
                        .header("X-XSRF-TOKEN", csrfToken)
                        .POST(HttpRequest.BodyPublishers.ofString("""
                                {"email": "cookie@lingora.test", "password": "shpija-e-madhe", "displayName": "Erza"}"""))
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(registration.statusCode()).isEqualTo(201);
        assertThat(registration.headers().allValues("Set-Cookie")).filteredOn(cookie -> cookie.startsWith("LINGORA_SESSION="))
                .singleElement().asString()
                .contains("HttpOnly", "SameSite=Lax", "Path=/")
                .doesNotContain("Secure");
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private static String cookieValue(List<String> setCookieHeaders, String name) {
        return setCookieHeaders.stream()
                .filter(header -> header.startsWith(name + "="))
                .map(header -> header.substring(name.length() + 1).split(";", 2)[0])
                .findFirst()
                .orElseThrow();
    }
}
