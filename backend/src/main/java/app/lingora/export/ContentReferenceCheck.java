package app.lingora.export;

import app.lingora.export.BackupDataValidator.ValidBackup;
import app.lingora.export.BackupRejectedException.UnknownContentReferences;
import app.lingora.export.LearnerTable.ContentKind;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/**
 * An export may come from an instance with other content. Instead of failing on the first foreign key, every
 * referenced exercise, item, unit and skill tag missing here is reported at once.
 */
@Component
class ContentReferenceCheck {

    private final LearnerDataStore store;

    ContentReferenceCheck(LearnerDataStore store) {
        this.store = store;
    }

    void requireKnownContent(ValidBackup backup) {
        Map<ContentKind, Set<String>> referenced = new EnumMap<>(ContentKind.class);
        backup.rows().forEach((table, rows) -> table.contentColumns().forEach((column, kind) -> {
            Set<String> ids = referenced.computeIfAbsent(kind, key -> new TreeSet<>());
            rows.forEach(row -> ids(row.get(LearnerTable.key(column))).forEach(ids::add));
        }));
        Map<ContentKind, List<String>> unknown = new EnumMap<>(ContentKind.class);
        referenced.forEach((kind, ids) -> unknown.put(kind, ids.isEmpty() ? List.of()
                : new TreeSet<>(store.missing(kind, ids)).stream().toList()));
        if (unknown.values().stream().anyMatch(ids -> !ids.isEmpty())) {
            throw BackupRejectedException.unknownContent(new UnknownContentReferences(
                    unknown.getOrDefault(ContentKind.EXERCISE, List.of()), unknown.getOrDefault(ContentKind.ITEM, List.of()),
                    unknown.getOrDefault(ContentKind.UNIT, List.of()), unknown.getOrDefault(ContentKind.SKILL_TAG, List.of())));
        }
    }

    /** A single id or an array of ids; other values are left to the database to reject. */
    private static Stream<String> ids(JsonNode value) {
        if (value == null || value.isNull()) {
            return Stream.empty();
        }
        if (value.isString()) {
            return Stream.of(value.asString());
        }
        return value.isArray() ? value.valueStream().filter(JsonNode::isString).map(JsonNode::asString) : Stream.empty();
    }
}
