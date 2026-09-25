package app.lingora.export;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * A table of learner data as stored in the backup file {@code data/<name>.json}: an array of rows with the listed
 * columns as camelCase keys. {@code user_id} is left out, since an import assigns the rows to the importing account,
 * and so are generated columns.
 *
 * @param orderBy         stable row order, so that an unchanged state always exports to identical files
 * @param contentColumns  columns referring to global content, which must exist when importing
 * @param ownedParents    columns referring to rows of another learner table, which must belong to the same learner
 */
record LearnerTable(String name, List<String> columns, String orderBy, Map<String, ContentKind> contentColumns,
                    Map<String, String> ownedParents) {

    LearnerTable {
        columns = List.copyOf(columns);
        contentColumns = Map.copyOf(contentColumns);
        ownedParents = Map.copyOf(ownedParents);
    }

    String file() {
        return ExportFormat.DATA + name + ".json";
    }

    /** camelCase key → column. */
    Map<String, String> columnsByKey() {
        return columns.stream().collect(Collectors.toMap(LearnerTable::key, Function.identity()));
    }

    static String key(String column) {
        StringBuilder key = new StringBuilder();
        boolean upper = false;
        for (char c : column.toCharArray()) {
            if (c == '_') {
                upper = true;
            } else {
                key.append(upper ? Character.toUpperCase(c) : c);
                upper = false;
            }
        }
        return key.toString();
    }

    /** Global content a learner table may refer to. */
    enum ContentKind {
        EXERCISE("exercises"),
        ITEM("content_items"),
        UNIT("content_units"),
        SKILL_TAG("content_skill_tags");

        private final String table;

        ContentKind(String table) {
            this.table = table;
        }

        String table() {
            return table;
        }
    }
}
