package app.lumastar;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * Full application on PostgreSQL 18 (Testcontainers). All integration tests share this configuration, hence one
 * Spring context and one container. The startup seed and the scheduled jobs are off; seed tests import the fixture
 * explicitly, job tests call the job. Mails are sent synchronously to the {@link MailCatcher}; web push runs with an
 * ephemeral key pair, and push messages go to the {@link RecordingPushSender}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "lumastar.content.seed-on-startup=false",
        "lumastar.plan.periodic-revision.cron=-",
        "lumastar.reminders.cron=-",
        "lumastar.push.ephemeral-keys=true",
        "spring.jpa.properties.hibernate.generate_statistics=true",
        "logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=warn",
        "lumastar.mail.async=false"
})
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, TestMailConfiguration.class, TestPushConfiguration.class})
public abstract class IntegrationTest {

    @Autowired
    protected MockMvcTester mvc;

    @Autowired
    protected JdbcClient jdbc;

    @Autowired
    protected MailCatcher mails;

    @Autowired
    protected RecordingPushSender pushes;

    @BeforeEach
    void forgetEarlierMailsAndPushes() {
        mails.clear();
        pushes.clear();
    }
}
