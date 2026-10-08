-- Streak goal (M10): the streak length the learner aims at, a rung of the ladder 10, 20, 30, 50, 75, 100, 150, 200, 250,
-- 300, 365, 465, 565, … days. Without a row the goal is 10 days.

CREATE TABLE streak_goals (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    target     integer     NOT NULL CHECK (target IN (10, 20, 30, 50, 75, 100, 150, 200, 250, 300)
                                           OR (target >= 365 AND (target - 365) % 100 = 0)),
    reached_on date,
    reached_at timestamptz,
    updated_at timestamptz NOT NULL,
    CHECK ((reached_on IS NULL) = (reached_at IS NULL))
);

COMMENT ON TABLE streak_goals IS 'The learner''s streak goal; once reached it stays until the learner chooses the next one';
COMMENT ON COLUMN streak_goals.target IS 'Streak length in days to reach';
COMMENT ON COLUMN streak_goals.reached_on IS 'Day (in the learner''s time zone) whose extension of the streak reached the target; NULL before';
COMMENT ON COLUMN streak_goals.reached_at IS 'When the target was reached; NULL before';
