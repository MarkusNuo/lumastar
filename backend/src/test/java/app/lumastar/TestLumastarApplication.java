package app.lumastar;

import org.springframework.boot.SpringApplication;

/**
 * Starts the full application on a throwaway PostgreSQL container: {@code ./gradlew bootTestRun}. Used for demos
 * and the Playwright e2e tests; run from {@code /backend}, it seeds the repository's {@code /content}.
 */
public class TestLumastarApplication {

    public static void main(String[] args) {
        SpringApplication.from(LumastarApplication::main).with(TestcontainersConfiguration.class).run(args);
    }
}
