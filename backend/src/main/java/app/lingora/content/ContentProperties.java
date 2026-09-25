package app.lingora.content;

import jakarta.validation.constraints.NotBlank;
import java.nio.file.Path;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Location of the {@code /content} directory. It is bound as text because Spring would resolve a {@link Path}
 * property as a servlet resource; a relative path resolves against the working directory.
 */
@Validated
@ConfigurationProperties("lingora.content")
public record ContentProperties(@NotBlank String path, @DefaultValue("true") boolean seedOnStartup) {

    public Path directory() {
        return Path.of(path).toAbsolutePath().normalize();
    }
}
