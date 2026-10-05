package app.lingora;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * Full application on PostgreSQL 18 (Testcontainers). All integration tests share this configuration, hence one
 * Spring context and one container. The startup seed and the scheduled jobs are off; seed tests import the fixture
 * explicitly, job tests call the job.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "lingora.content.seed-on-startup=false",
        "lingora.plan.periodic-revision.cron=-",
        "spring.jpa.properties.hibernate.generate_statistics=true",
        "logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=warn"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public abstract class IntegrationTest {

    @Autowired
    protected MockMvcTester mvc;

    @Autowired
    protected JdbcClient jdbc;
}
