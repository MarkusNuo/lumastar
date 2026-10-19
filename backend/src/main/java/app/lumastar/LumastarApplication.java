package app.lumastar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

// Accounts live in the database; Boot's generated in-memory user must not exist.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class LumastarApplication {

    public static void main(String[] args) {
        SpringApplication.run(LumastarApplication.class, args);
    }
}
