package app.lumastar.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;

class ContentSeedRunnerTest extends IntegrationTest {

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    private final List<Object> events = new ArrayList<>();

    @BeforeEach
    void startWithoutContent() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
    }

    @Test
    void announcesWhatTheSeedDid() {
        runner(true).run(new DefaultApplicationArguments());

        assertThat(events).singleElement().isInstanceOfSatisfying(ContentSeeded.class, seeded -> {
            assertThat(seeded.summary().units()).isEqualTo(new SeedSummary.Count(3, 3, 0));
            assertThat(seeded.summary().unitsChanged()).isTrue();
        });
    }

    @Test
    void announcesNothingWhenTheSeedIsOff() {
        runner(false).run(new DefaultApplicationArguments());

        assertThat(events).isEmpty();
        assertThat(jdbc.sql("SELECT count(*) FROM content_units").query(Integer.class).single()).isZero();
    }

    private ContentSeedRunner runner(boolean seedOnStartup) {
        return new ContentSeedRunner(new ContentProperties(ContentFixture.path().toString(), seedOnStartup), loader, seeder,
                events::add);
    }
}
