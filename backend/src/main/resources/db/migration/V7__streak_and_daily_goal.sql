-- Streak, daily goal and statistics (PRD F9, F10). The streaks row is the state of the streak; streak_days is its
-- history, from which the statistics show the days with the goal met and the days bridged by a streak freeze.

COMMENT ON COLUMN streaks.current_days IS 'Days in a row with the daily goal met, up to last_active_date; a gap since is judged on read';
COMMENT ON COLUMN streaks.last_active_date IS 'Last day (in the learner''s time zone) with the daily goal met';
COMMENT ON COLUMN streaks.freezes_available IS 'Streak freezes left in the ISO week starting on freezes_refilled_on; every other week has its full freeze';
COMMENT ON COLUMN streaks.freezes_refilled_on IS 'Monday of the ISO week freezes_available refers to; NULL before a freeze was used';

ALTER TABLE streaks
    ADD CONSTRAINT streaks_one_freeze_per_week_check CHECK (freezes_available <= 1),
    ADD CONSTRAINT streaks_freeze_week_check CHECK (extract(isodow FROM freezes_refilled_on) = 1);

CREATE TABLE streak_days (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day          date        NOT NULL,
    kind         text        NOT NULL CHECK (kind IN ('goal_met', 'freeze')),
    goal_minutes integer     CHECK (goal_minutes > 0),
    session_id   uuid        REFERENCES sessions (id) ON DELETE SET NULL,
    recorded_at  timestamptz NOT NULL,
    UNIQUE (user_id, day),
    CHECK ((kind = 'goal_met') = (goal_minutes IS NOT NULL)),
    CHECK (kind = 'goal_met' OR session_id IS NULL)
);

COMMENT ON TABLE streak_days IS 'Days that count for the streak: daily goal met, or a single missed day bridged by the weekly streak freeze';
COMMENT ON COLUMN streak_days.day IS 'Date in the learner''s time zone';
COMMENT ON COLUMN streak_days.goal_minutes IS 'The daily goal that was met';
COMMENT ON COLUMN streak_days.session_id IS 'The lesson whose completion met the goal; NULL if a placement test or a lowered goal met it';

-- Practice per day (daily goal, calendar heatmap): completed lessons by completion time.
CREATE INDEX sessions_user_finished_idx ON sessions (user_id, finished_at) WHERE finished_at IS NOT NULL;
