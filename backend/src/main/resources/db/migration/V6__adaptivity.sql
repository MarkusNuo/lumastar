-- Adaptivity (PRD F7-F9, chapter 5): the target retention of every FSRS review, checkpoint results and level badges.

ALTER TABLE review_log
    ADD COLUMN request_retention double precision NOT NULL DEFAULT 0.9
        CHECK (request_retention > 0 AND request_retention < 1);

ALTER TABLE review_log
    ALTER COLUMN request_retention DROP DEFAULT;

COMMENT ON COLUMN review_log.request_retention IS 'Target retention (users.settings requestRetention) the review was scheduled with';

-- A finished checkpoint is passed or failed; every other session has no checkpoint result.
ALTER TABLE sessions
    ADD COLUMN checkpoint_passed boolean,
    ADD CONSTRAINT sessions_checkpoint_passed_check CHECK (
        CASE WHEN kind = 'checkpoint' THEN (checkpoint_passed IS NULL) = (finished_at IS NULL)
             ELSE checkpoint_passed IS NULL END);

COMMENT ON COLUMN sessions.checkpoint_passed IS 'Result of a finished checkpoint (PRD chapter 5); NULL for other sessions';

CREATE INDEX sessions_user_checkpoints_idx ON sessions (user_id, level) WHERE kind = 'checkpoint';

CREATE TABLE badges (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code       text        NOT NULL CHECK (code IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    session_id uuid        REFERENCES sessions (id) ON DELETE SET NULL,
    awarded_at timestamptz NOT NULL,
    UNIQUE (user_id, code)
);

COMMENT ON TABLE badges IS 'Level badges (PRD F9): one per CEFR band, awarded by the checkpoint that completes the band';
COMMENT ON COLUMN badges.session_id IS 'The checkpoint session that awarded the badge';
