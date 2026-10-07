package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.LingoraApplication;
import app.lingora.SpaClient;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.TypeExcludeFilter;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.type.classreading.MetadataReader;
import org.springframework.core.type.classreading.MetadataReaderFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** HTTP sessions live in PostgreSQL, so a restarted server still knows a signed-in browser. */
class SessionPersistenceTest extends IntegrationTest {

    @Autowired
    private PostgreSQLContainer postgres;

    @BeforeEach
    void freshInstance() {
        jdbc.sql("DELETE FROM users").update();
    }

    @Test
    void aSignedInSessionSurvivesAServerRestart() throws IOException, InterruptedException {
        SpaClient browser = new SpaClient(mvc);
        browser.register("Erza");

        try (ConfigurableApplicationContext restarted = startSecondServer()) {
            int port = ((WebServerApplicationContext) restarted).getWebServer().getPort();
            HttpResponse<String> me = HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:%d/api/me".formatted(port)))
                            .header("Cookie", SpaClient.SESSION_COOKIE + "=" + browser.sessionCookie())
                            .build(),
                    HttpResponse.BodyHandlers.ofString());

            assertThat(me.statusCode()).isEqualTo(200);
            assertThat(me.body()).contains("\"displayName\":\"Erza\"");
        }
    }

    /** A second application on the same database, as after a restart; test configurations stay out of its scan. */
    private ConfigurableApplicationContext startSecondServer() {
        return new SpringApplicationBuilder(LingoraApplication.class)
                .initializers(context -> context.getBeanFactory()
                        .registerSingleton("excludeTestConfigurations", new ExcludeTestConfigurations()))
                .run("--server.port=0",
                        "--spring.datasource.url=" + postgres.getJdbcUrl(),
                        "--spring.datasource.username=" + postgres.getUsername(),
                        "--spring.datasource.password=" + postgres.getPassword(),
                        "--lingora.content.seed-on-startup=false");
    }

    private static final class ExcludeTestConfigurations extends TypeExcludeFilter {

        @Override
        public boolean match(MetadataReader reader, MetadataReaderFactory factory) {
            return reader.getAnnotationMetadata().hasAnnotation(TestConfiguration.class.getName());
        }
    }
}
