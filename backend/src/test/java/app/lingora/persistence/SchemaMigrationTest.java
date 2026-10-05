package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/** The context only starts if Flyway migrated and Hibernate validated the mapped entities against the schema. */
class SchemaMigrationTest extends IntegrationTest {

    private static final List<String> LEARNER_TABLES = List.of("streaks", "placement_tests", "placement_answers",
            "learning_plans", "plan_changes", "sessions", "attempts", "skill_mastery", "srs_cards", "review_log",
            "fsrs_params", "ai_requests", "badges", "streak_days");
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
                Map.of("version", "7", "success", true));
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
    void knowsTheCodeSetsOfTheDomain() {
        List<Boolean> checks = jdbc.sql("""
                        SELECT unnest(ARRAY [is_level_code('C2.3'), is_level_code('A1.4'),
                                             is_error_category('variant.standard_form'), is_error_category('grammar.tense')])""")
                .query(Boolean.class).list();

        assertThat(checks).containsExactly(true, false, true, false);
    }
}
