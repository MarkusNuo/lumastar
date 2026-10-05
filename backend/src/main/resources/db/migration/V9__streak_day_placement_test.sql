-- A completed placement test counts towards the daily goal (PRD F9); its result shows whether it met the goal.

ALTER TABLE streak_days
    ADD COLUMN placement_test_id uuid REFERENCES placement_tests (id) ON DELETE SET NULL,
    ADD CONSTRAINT streak_days_placement_test_goal_met_check CHECK (kind = 'goal_met' OR placement_test_id IS NULL),
    ADD CONSTRAINT streak_days_one_completion_check CHECK (session_id IS NULL OR placement_test_id IS NULL);

COMMENT ON COLUMN streak_days.placement_test_id IS 'The placement test whose completion met the goal; NULL if a lesson or a lowered goal met it';
