-- Lesson results (PRD F5, F9): the XP breakdown is stored so that completing a lesson again returns the same result.

ALTER TABLE sessions
    ADD COLUMN xp_base          integer NOT NULL DEFAULT 0 CHECK (xp_base >= 0),
    ADD COLUMN xp_perfect_bonus integer NOT NULL DEFAULT 0 CHECK (xp_perfect_bonus >= 0),
    ADD COLUMN xp_speed_bonus   integer NOT NULL DEFAULT 0 CHECK (xp_speed_bonus >= 0),
    ADD CONSTRAINT sessions_xp_breakdown_check CHECK (xp_earned = xp_base + xp_perfect_bonus + xp_speed_bonus),
    ADD CONSTRAINT sessions_finished_result_check CHECK (
        finished_at IS NULL OR (exercise_count IS NOT NULL AND correct_count IS NOT NULL AND accuracy IS NOT NULL));

COMMENT ON COLUMN sessions.accuracy IS 'Share of exercises answered correctly at the first attempt (retries excluded)';

-- Correct, almost correct and standard-form answers count as correct; derived so that it can never disagree.
ALTER TABLE attempts
    ADD COLUMN is_correct boolean GENERATED ALWAYS AS (outcome <> 'wrong') STORED;
