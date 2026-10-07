package app.lingora.export;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * The backup must stay a complete copy of the learner state: a migration that adds learner data fails here until the
 * export format covers it (see {@link LearnerTables}).
 */
class LearnerTablesTest extends IntegrationTest {

    /**
     * Usage log of the AI requests (Phase 2), not learner state, and the links of account mails, which belong to the
     * account rather than to its learning state; an import leaves both alone.
     */
    private static final Set<String> NOT_EXPORTED = Set.of("ai_requests", "account_tokens");
    /** The identity of the account, which an import into another account must not take over. */
    private static final Set<String> ACCOUNT_COLUMNS = Set.of("id", "password_hash", "created_at", "email",
            "email_verified_at", "pending_email");

    @Test
    void everyTableWithLearnerDataIsExportedOrDeliberatelyLeftOut() {
        List<String> learnerTables = jdbc.sql("""
                        SELECT table_name FROM information_schema.columns
                        WHERE table_schema = current_schema() AND column_name = 'user_id' ORDER BY table_name""")
                .query(String.class).list();

        assertThat(learnerTables).containsExactlyInAnyOrderElementsOf(
                Stream.concat(LearnerTables.ALL.stream().map(LearnerTable::name), NOT_EXPORTED.stream())
                        .toList());
    }

    @Test
    void everyTableIsExportedWithAllItsColumns() {
        for (LearnerTable table : LearnerTables.ALL) {
            assertThat(columns(table.name()))
                    .as(table.name())
                    .filteredOn(column -> !column.equals("user_id"))
                    .containsExactlyInAnyOrderElementsOf(table.columns());
        }
    }

    @Test
    void theProfileHoldsEveryColumnOfTheAccountExceptItsIdentity() {
        assertThat(columns("users"))
                .filteredOn(column -> !ACCOUNT_COLUMNS.contains(column))
                .containsExactlyInAnyOrderElementsOf(LearnerTables.PROFILE_COLUMNS);
    }

    @Test
    void referencesToOtherLearnerTablesPointToExportedTables() {
        Set<String> exported = Set.copyOf(LearnerTables.ALL.stream().map(LearnerTable::name).toList());

        LearnerTables.ALL.forEach(table -> assertThat(exported).containsAll(table.ownedParents().values()));
    }

    /** Stored columns; generated ones such as {@code attempts.is_correct} are derived again on import. */
    private List<String> columns(String table) {
        return jdbc.sql("""
                        SELECT column_name FROM information_schema.columns
                        WHERE table_schema = current_schema() AND table_name = :table AND is_generated = 'NEVER'""")
                .param("table", table)
                .query(String.class).list();
    }
}
