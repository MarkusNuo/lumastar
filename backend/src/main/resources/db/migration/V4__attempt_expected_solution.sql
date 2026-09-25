-- The solution shown with the feedback of an answer, i.e. the accepted solution closest to it (PRD F5). It is the
-- "expected" value of recent_errors.json (PRD 8.3); attempts recorded before this migration fall back to the first
-- solution of the exercise.

ALTER TABLE attempts
    ADD COLUMN expected text;

COMMENT ON COLUMN attempts.expected IS 'Solution shown with the feedback; NULL where no single solution applies (match_pairs)';
