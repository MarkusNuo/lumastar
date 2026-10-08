package app.lingora.export;

import app.lingora.export.LearnerTable.ContentKind;
import java.util.List;
import java.util.Map;

/**
 * The learner data of a backup (export format version {@value ExportFormat#SCHEMA_VERSION}). The account row itself
 * is exported as {@link #PROFILE_COLUMNS}, without its identity (id, e-mail, password hash, creation time). Push
 * subscriptions and reminders are left out: they belong to the devices and the notification setup on this instance.
 * A new column in one of these tables changes the format: {@code LearnerTablesTest} fails until it is listed here and,
 * if older exports cannot provide it, a {@link BackupUpgrader} fills it in.
 */
final class LearnerTables {

    static final List<String> PROFILE_COLUMNS = List.of("display_name", "motivations", "daily_goal_minutes",
            "self_assessment", "current_level", "xp_total", "time_zone", "settings", "onboarding_completed_at");

    /** Parents before children: the insert order of an import; deletion runs in reverse. */
    static final List<LearnerTable> ALL = List.of(
            table("streaks", "id",
                    "id", "current_days", "longest_days", "last_active_date", "freezes_available", "freezes_refilled_on",
                    "updated_at"),
            table("streak_goals", "id",
                    "id", "target", "reached_on", "reached_at", "updated_at"),
            table("fsrs_params", "version, id",
                    "id", "version", "scheduler_version", "weights", "review_count", "metrics", "active", "created_at"),
            table("learning_plans", "version, id",
                    "id", "version", "generated_by", "plan", "valid_from"),
            table("plan_changes", "created_at, id", Map.of(), Map.of("plan_id", "learning_plans"),
                    "id", "plan_id", "triggered_by", "kind", "reason", "details", "created_at"),
            table("placement_tests", "started_at, id",
                    "id", "status", "engine", "start_level", "current_level", "result_level", "state", "result", "started_at",
                    "finished_at"),
            table("placement_answers", "placement_test_id, position", Map.of("exercise_id", ContentKind.EXERCISE),
                    Map.of("placement_test_id", "placement_tests"),
                    "id", "placement_test_id", "position", "exercise_id", "level", "competence", "answer", "outcome",
                    "error_category", "response_ms", "answered_at"),
            table("sessions", "started_at, id",
                    Map.of("unit_id", ContentKind.UNIT, "exercise_ids", ContentKind.EXERCISE), Map.of(),
                    "id", "kind", "unit_id", "level", "focus_skill_tags", "composed_by", "exercise_ids", "started_at",
                    "finished_at", "exercise_count", "correct_count", "accuracy", "xp_earned", "xp_base", "xp_perfect_bonus",
                    "xp_speed_bonus", "checkpoint_passed"),
            table("badges", "code", Map.of(), Map.of("session_id", "sessions"),
                    "id", "code", "session_id", "awarded_at"),
            table("streak_days", "day", Map.of(),
                    Map.of("session_id", "sessions", "placement_test_id", "placement_tests"),
                    "id", "day", "kind", "goal_minutes", "session_id", "placement_test_id", "recorded_at"),
            table("attempts", "answered_at, session_id, position", Map.of("exercise_id", ContentKind.EXERCISE),
                    Map.of("session_id", "sessions"),
                    "id", "session_id", "position", "exercise_id", "exercise_type", "skill_tags", "is_retry", "answer",
                    "outcome", "error_category", "fsrs_rating", "response_ms", "evaluated_by", "answered_at", "expected"),
            table("skill_mastery", "skill_tag", Map.of("skill_tag", ContentKind.SKILL_TAG), Map.of(),
                    "id", "skill_tag", "mastery", "attempts", "correct", "last_practiced_at", "updated_at"),
            table("srs_cards", "item_id", Map.of("item_id", ContentKind.ITEM), Map.of(),
                    "id", "item_id", "state", "step", "stability", "difficulty", "due", "last_review", "reps", "lapses",
                    "created_at"),
            table("review_log", "reviewed_at, id", Map.of("item_id", ContentKind.ITEM),
                    Map.of("card_id", "srs_cards", "attempt_id", "attempts", "fsrs_params_id", "fsrs_params"),
                    "id", "card_id", "item_id", "attempt_id", "rating", "reviewed_at", "response_ms", "state_before",
                    "state_after", "scheduler_version", "fsrs_params_id", "request_retention"));

    private LearnerTables() {
    }

    private static LearnerTable table(String name, String orderBy, String... columns) {
        return table(name, orderBy, Map.of(), Map.of(), columns);
    }

    private static LearnerTable table(String name, String orderBy, Map<String, ContentKind> contentColumns,
                                      Map<String, String> ownedParents, String... columns) {
        return new LearnerTable(name, List.of(columns), orderBy, contentColumns, ownedParents);
    }
}
