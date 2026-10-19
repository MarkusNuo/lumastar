package app.lumastar.export;

import java.util.function.Consumer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Row edits of the {@link BackupUpgrader}s on a data file, an array of rows. */
final class DataRows {

    private DataRows() {
    }

    /** A copy of the rows with the field added to each; anything but an array of objects is left to the validator. */
    static JsonNode withField(JsonNode rows, Consumer<ObjectNode> addField) {
        if (!(rows instanceof ArrayNode array)) {
            return rows;
        }
        ArrayNode copy = array.deepCopy();
        copy.forEach(row -> {
            if (row instanceof ObjectNode object) {
                addField.accept(object);
            }
        });
        return copy;
    }
}
