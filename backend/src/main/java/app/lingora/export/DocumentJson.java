package app.lingora.export;

import java.nio.charset.StandardCharsets;
import tools.jackson.core.util.DefaultIndenter;
import tools.jackson.core.util.DefaultPrettyPrinter;
import tools.jackson.core.util.Separators;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectWriter;
import tools.jackson.databind.cfg.JsonNodeFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * JSON of the profile documents and the backup files: two-space indent and LF line endings on every OS. Decimals are
 * read as {@code BigDecimal} with their trailing zeros, so that database values pass through a backup unchanged.
 */
final class DocumentJson {

    static final JsonMapper MAPPER = JsonMapper.builder()
            .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
            .disable(JsonNodeFeature.STRIP_TRAILING_BIGDECIMAL_ZEROES)
            .build();

    private static final DefaultIndenter INDENTER = new DefaultIndenter("  ", "\n");
    private static final ObjectWriter WRITER = MAPPER.writer().with(new DefaultPrettyPrinter(Separators.createDefaultInstance()
                    .withObjectNameValueSpacing(Separators.Spacing.AFTER)
                    .withObjectEmptySeparator("")
                    .withArrayEmptySeparator(""))
            .withObjectIndenter(INDENTER)
            .withArrayIndenter(INDENTER));

    private DocumentJson() {
    }

    static byte[] write(Object value) {
        return (WRITER.writeValueAsString(value) + "\n").getBytes(StandardCharsets.UTF_8);
    }

    static JsonNode read(String json) {
        return MAPPER.readTree(json);
    }
}
