package app.lingora.export;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.export.BackupDataValidator.ValidBackup;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

class RowIdsTest {

    private static final UUID IMPORTING = UUID.fromString("00000000-0000-0000-0000-0000000000b0");
    private static final UUID OTHER_IMPORTING = UUID.fromString("00000000-0000-0000-0000-0000000000c0");
    private static final String SESSION = "11111111-1111-1111-1111-111111111111";
    private static final String ATTEMPT = "22222222-2222-2222-2222-222222222222";
    private static final String FOREIGN_SESSION = "33333333-3333-3333-3333-333333333333";

    @Test
    void listsTheWellFormedIdsOfTheRows() {
        ArrayNode rows = (ArrayNode) DocumentJson.read("""
                [{"id": "%s"}, {"id": "not-a-uuid"}, {"id": null}, {"id": 7}, {}]""".formatted(SESSION));

        assertThat(RowIds.of(rows)).containsExactly(SESSION);
    }

    @Test
    void givesEveryRowANewIdAndLetsTheReferencesBetweenTheRowsFollow() {
        ValidBackup reassigned = RowIds.reassigned(IMPORTING, backup(SESSION));

        JsonNode session = rows(reassigned, "sessions").get(0);
        JsonNode attempt = rows(reassigned, "attempts").get(0);
        assertThat(session.get("id").asString()).isNotEqualTo(SESSION);
        assertThat(attempt.get("id").asString()).isNotEqualTo(ATTEMPT);
        assertThat(attempt.get("sessionId")).isEqualTo(session.get("id"));
        assertThat(attempt.get("position").asInt()).isEqualTo(1);
    }

    @Test
    void leavesReferencesToRowsOutsideTheBackupForTheOwnershipCheck() {
        ValidBackup reassigned = RowIds.reassigned(IMPORTING, backup(FOREIGN_SESSION));

        assertThat(rows(reassigned, "attempts").get(0).get("sessionId").asString()).isEqualTo(FOREIGN_SESSION);
    }

    @Test
    void derivesTheNewIdsFromTheImportingAccountAndTheOldId() {
        String first = rows(RowIds.reassigned(IMPORTING, backup(SESSION)), "sessions").get(0).get("id").asString();
        String again = rows(RowIds.reassigned(IMPORTING, backup(SESSION)), "sessions").get(0).get("id").asString();
        String forOther = rows(RowIds.reassigned(OTHER_IMPORTING, backup(SESSION)), "sessions").get(0).get("id").asString();

        assertThat(again).isEqualTo(first);
        assertThat(forOther).isNotEqualTo(first);
        assertThat(UUID.fromString(first)).isNotNull();
    }

    @Test
    void leavesTheImportedBackupUnchanged() {
        ValidBackup backup = backup(SESSION);

        RowIds.reassigned(IMPORTING, backup);

        assertThat(rows(backup, "sessions").get(0).get("id").asString()).isEqualTo(SESSION);
    }

    private static ValidBackup backup(String attemptSession) {
        Map<LearnerTable, ArrayNode> rows = new LinkedHashMap<>();
        LearnerTables.ALL.forEach(table -> rows.put(table, DocumentJson.MAPPER.createArrayNode()));
        rows.get(table("sessions")).add(DocumentJson.read("""
                {"id": "%s", "kind": "lesson"}""".formatted(SESSION)));
        rows.get(table("attempts")).add(DocumentJson.read("""
                {"id": "%s", "sessionId": "%s", "position": 1}""".formatted(ATTEMPT, attemptSession)));
        return new ValidBackup((ObjectNode) DocumentJson.read("{}"), rows);
    }

    private static ArrayNode rows(ValidBackup backup, String table) {
        return backup.rows().get(table(table));
    }

    private static LearnerTable table(String name) {
        return LearnerTables.ALL.stream().filter(table -> table.name().equals(name)).findFirst().orElseThrow();
    }
}
