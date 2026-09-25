package app.lingora.export;

import app.lingora.export.BackupRejectedException.Issue;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Checks that the data files have exactly the shape of the current format: every file present, every row an object
 * with exactly the columns of its table. Value types and constraints are checked by the database on insert.
 */
final class BackupDataValidator {

    static final int MAX_REPORTED_ISSUES = 20;

    private static final Set<String> PROFILE_KEYS = LearnerTables.PROFILE_COLUMNS.stream()
            .map(LearnerTable::key)
            .collect(Collectors.toSet());

    /** The profile and the rows of every table of {@link LearnerTables#ALL}, in that order. */
    record ValidBackup(ObjectNode profile, Map<LearnerTable, ArrayNode> rows) {
    }

    ValidBackup validate(Map<String, JsonNode> dataFiles) {
        List<Issue> issues = new ArrayList<>();
        ObjectNode profile = profile(dataFiles.get(ExportFormat.PROFILE_DATA), issues);
        Map<LearnerTable, ArrayNode> rows = new LinkedHashMap<>();
        for (LearnerTable table : LearnerTables.ALL) {
            rows.put(table, rows(table, dataFiles.get(table.file()), issues));
        }
        Set<String> unknownFiles = new TreeSet<>(dataFiles.keySet());
        unknownFiles.remove(ExportFormat.PROFILE_DATA);
        LearnerTables.ALL.forEach(table -> unknownFiles.remove(table.file()));
        unknownFiles.forEach(file -> issues.add(new Issue(file, "unknown data file")));
        if (!issues.isEmpty()) {
            throw BackupRejectedException.invalidData(issues.stream().limit(MAX_REPORTED_ISSUES).toList());
        }
        return new ValidBackup(profile, rows);
    }

    private static ObjectNode profile(JsonNode file, List<Issue> issues) {
        String path = ExportFormat.PROFILE_DATA;
        if (file == null) {
            issues.add(new Issue(path, "missing"));
            return null;
        }
        if (!(file instanceof ObjectNode profile)) {
            issues.add(new Issue(path, "must be a JSON object"));
            return null;
        }
        requireKeys(profile, PROFILE_KEYS, path, issues);
        JsonNode timeZone = profile.get(LearnerTable.key("time_zone"));
        if (timeZone != null && !isZoneId(timeZone)) {
            issues.add(new Issue(path + ".timeZone", "must be a time zone such as Europe/Zurich"));
        }
        return profile;
    }

    private static ArrayNode rows(LearnerTable table, JsonNode file, List<Issue> issues) {
        if (file == null) {
            issues.add(new Issue(table.file(), "missing"));
            return null;
        }
        if (!(file instanceof ArrayNode rows)) {
            issues.add(new Issue(table.file(), "must be a JSON array of rows"));
            return null;
        }
        Set<String> keys = table.columnsByKey().keySet();
        for (int index = 0; index < rows.size(); index++) {
            String path = "%s[%d]".formatted(table.file(), index);
            if (rows.get(index) instanceof ObjectNode row) {
                requireKeys(row, keys, path, issues);
            } else {
                issues.add(new Issue(path, "must be a JSON object"));
            }
        }
        return rows;
    }

    private static void requireKeys(ObjectNode object, Set<String> expected, String path, List<Issue> issues) {
        Set<String> actual = object.properties().stream().map(Map.Entry::getKey).collect(Collectors.toSet());
        new TreeSet<>(expected).stream().filter(key -> !actual.contains(key))
                .forEach(key -> issues.add(new Issue(path + "." + key, "missing")));
        new TreeSet<>(actual).stream().filter(key -> !expected.contains(key))
                .forEach(key -> issues.add(new Issue(path + "." + key, "unknown field")));
    }

    private static boolean isZoneId(JsonNode value) {
        if (!value.isString()) {
            return false;
        }
        try {
            ZoneId.of(value.asString());
            return true;
        } catch (DateTimeException e) {
            return false;
        }
    }
}
