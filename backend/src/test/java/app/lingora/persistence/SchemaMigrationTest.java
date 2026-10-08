package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.IntegrationTest;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

/** The context only starts if Flyway migrated and Hibernate validated the mapped entities against the schema. */
class SchemaMigrationTest extends IntegrationTest {

    private static final List<String> LEARNER_TABLES = List.of("streaks", "placement_tests", "placement_answers",
            "learning_plans", "plan_changes", "sessions", "attempts", "skill_mastery", "srs_cards", "review_log",
            "fsrs_params", "ai_requests", "badges", "streak_days", "account_tokens", "push_subscriptions", "reminder_settings",
            "reminder_log", "streak_goals");
    private static final List<String> HTTP_SESSION_TABLES = List.of("spring_session", "spring_session_attributes");
    private static final List<String> CONTENT_TABLES = List.of("content_skill_tags", "content_stages", "content_units",
            "content_items", "exercises");

    @Test
    void appliesAllMigrations() {
        List<Map<String, Object>> history = jdbc.sql("""
                        SELECT version, success FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank""")
                .query().listOfRows();

        assertThat(history).containsExactly(Map.of("version", "1", "success", true), Map.of("version", "2", "success", true),
                Map.of("version", "3", "success", true), Map.of("version", "4", "success", true),
                Map.of("version", "5", "success", true), Map.of("version", "6", "success", true),
                Map.of("version", "7", "success", true), Map.of("version", "8", "success", true),
                Map.of("version", "9", "success", true), Map.of("version", "10", "success", true),
                Map.of("version", "11", "success", true), Map.of("version", "12", "success", true),
                Map.of("version", "13", "success", true), Map.of("version", "14", "success", true));
    }

    @Test
    void createsAllTablesOfThePrd() {
        List<String> tables = jdbc.sql("""
                        SELECT table_name FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name <> 'flyway_schema_history'""")
                .query(String.class).list();

        assertThat(tables).containsExactlyInAnyOrderElementsOf(
                Stream.of(List.of("users"), LEARNER_TABLES, CONTENT_TABLES, HTTP_SESSION_TABLES).flatMap(List::stream).toList());
    }

    @Test
    void everyLearnerTableReferencesItsUser() {
        List<String> tablesWithUserForeignKey = jdbc.sql("""
                        SELECT c.table_name
                        FROM information_schema.columns c
                        JOIN information_schema.key_column_usage k
                          ON k.table_name = c.table_name AND k.column_name = c.column_name
                        JOIN information_schema.referential_constraints r ON r.constraint_name = k.constraint_name
                        JOIN information_schema.constraint_column_usage u ON u.constraint_name = r.unique_constraint_name
                        WHERE c.table_schema = 'public' AND c.column_name = 'user_id' AND c.is_nullable = 'NO'
                          AND u.table_name = 'users'""")
                .query(String.class).list();

        assertThat(tablesWithUserForeignKey).containsExactlyInAnyOrderElementsOf(LEARNER_TABLES);
    }

    /** Deleting an account (DELETE /api/account) relies on it: no learner table may keep rows of a deleted user. */
    @Test
    void everyLearnerTableIsDeletedWithItsUser() {
        Map<String, String> deleteRules = jdbc.sql("""
                        SELECT k.table_name, r.delete_rule
                        FROM information_schema.key_column_usage k
                        JOIN information_schema.referential_constraints r
                          ON r.constraint_schema = k.constraint_schema AND r.constraint_name = k.constraint_name
                        JOIN information_schema.constraint_column_usage u
                          ON u.constraint_schema = r.unique_constraint_schema AND u.constraint_name = r.unique_constraint_name
                        WHERE k.table_schema = 'public' AND k.column_name = 'user_id' AND u.table_name = 'users'""")
                .query((row, rowNumber) -> Map.entry(row.getString("table_name"), row.getString("delete_rule")))
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        assertThat(deleteRules).containsOnlyKeys(LEARNER_TABLES).allSatisfy((table, rule) -> assertThat(rule)
                .as("ON DELETE of %s.user_id", table).isEqualTo("CASCADE"));
    }

    @Test
    void contentTablesAreGlobal() {
        List<String> contentTablesWithUserId = jdbc.sql("""
                        SELECT table_name FROM information_schema.columns
                        WHERE table_schema = 'public' AND column_name = 'user_id' AND table_name IN (:tables)""")
                .param("tables", CONTENT_TABLES)
                .query(String.class).list();

        assertThat(contentTablesWithUserId).isEmpty();
    }

    @Test
    void signInAddressesAreUniqueRegardlessOfCase() {
        jdbc.sql("DELETE FROM users").update();
        jdbc.sql("INSERT INTO users (display_name, password_hash, email) VALUES ('Erza', 'hash', 'Erza@Example.com')").update();

        assertThatThrownBy(() -> jdbc.sql("""
                        INSERT INTO users (display_name, password_hash, email) VALUES ('Arta', 'hash', 'erza@example.COM')""")
                .update())
                .isInstanceOf(DuplicateKeyException.class)
                .hasMessageContaining("users_email_key");
    }

    @Test
    void knowsTheCodeSetsOfTheDomain() {
        List<Boolean> checks = jdbc.sql("""
                        SELECT unnest(ARRAY [is_level_code('C2.3'), is_level_code('A1.4'),
                                             is_error_category('variant.standard_form'), is_error_category('grammar.tense')])""")
                .query(Boolean.class).list();

        assertThat(checks).containsExactly(true, false, true, false);
    }
}
