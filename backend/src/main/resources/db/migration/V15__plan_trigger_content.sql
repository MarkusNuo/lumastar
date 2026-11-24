-- Changed course content (units added or retired) revises the plans of existing learners.

ALTER TABLE plan_changes
    DROP CONSTRAINT plan_changes_triggered_by_check,
    ADD CONSTRAINT plan_changes_triggered_by_check
        CHECK (triggered_by IN ('placement', 'checkpoint', 'periodic', 'lesson', 'manual', 'content'));
