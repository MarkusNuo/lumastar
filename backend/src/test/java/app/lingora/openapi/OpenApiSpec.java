package app.lingora.openapi;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import tools.jackson.core.util.DefaultIndenter;
import tools.jackson.core.util.DefaultPrettyPrinter;
import tools.jackson.core.util.Separators;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * The committed spec {@code backend/openapi/openapi.json} and its canonical form: keys sorted, two-space indent,
 * LF line endings and a final newline, so that the file is identical on every OS.
 */
final class OpenApiSpec {

    static final Path FILE = Path.of(System.getProperty("lingora.openapi.spec", "openapi/openapi.json"));

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final DefaultIndenter INDENTER = new DefaultIndenter("  ", "\n");
    private static final DefaultPrettyPrinter PRINTER = new DefaultPrettyPrinter(Separators.createDefaultInstance()
            .withObjectNameValueSpacing(Separators.Spacing.AFTER)
            .withObjectEmptySeparator("")
            .withArrayEmptySeparator(""))
            .withObjectIndenter(INDENTER)
            .withArrayIndenter(INDENTER);

    private OpenApiSpec() {
    }

    static String live(MockMvcTester mvc) {
        MockHttpServletResponse response = mvc.get().uri("/v3/api-docs").exchange().getResponse();
        if (response.getStatus() != HttpStatus.OK.value()) {
            throw new IllegalStateException("GET /v3/api-docs answered " + response.getStatus());
        }
        return canonical(JSON.readTree(new String(response.getContentAsByteArray(), StandardCharsets.UTF_8)));
    }

    static String canonical(String json) {
        return canonical(JSON.readTree(json));
    }

    private static String canonical(JsonNode spec) {
        return JSON.writer().with(PRINTER).writeValueAsString(sorted(spec)) + "\n";
    }

    private static JsonNode sorted(JsonNode node) {
        if (node instanceof ObjectNode object) {
            Map<String, JsonNode> fields = new TreeMap<>();
            object.properties().forEach(entry -> fields.put(entry.getKey(), sorted(entry.getValue())));
            ObjectNode copy = JSON.createObjectNode();
            fields.forEach(copy::set);
            return copy;
        }
        if (node instanceof ArrayNode array) {
            ArrayNode copy = JSON.createArrayNode();
            for (Iterator<JsonNode> elements = array.values().iterator(); elements.hasNext(); ) {
                copy.add(sorted(elements.next()));
            }
            return copy;
        }
        return node;
    }
}
