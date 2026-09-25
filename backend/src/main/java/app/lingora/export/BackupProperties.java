package app.lingora.export;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.unit.DataSize;

/**
 * Limits of an import ({@code lingora.backup}). The unpacked limit guards against ZIP bombs; exports stay far
 * below both limits for many years of daily learning.
 */
@ConfigurationProperties("lingora.backup")
public record BackupProperties(
        @DefaultValue("20MB") DataSize maxArchiveSize,
        @DefaultValue("100MB") DataSize maxUnpackedSize,
        @DefaultValue("100") int maxEntries) {
}
