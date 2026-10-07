-- At most one open link per account and purpose: a new link replaces the earlier one in a single statement, so that
-- concurrent requests (e.g. two password resets at once) can never leave two valid links.

DELETE FROM account_tokens older
USING account_tokens newer
WHERE newer.user_id = older.user_id
  AND newer.purpose = older.purpose
  AND (newer.created_at, newer.id) > (older.created_at, older.id);

DROP INDEX account_tokens_user_purpose_idx;

ALTER TABLE account_tokens ADD CONSTRAINT account_tokens_user_purpose_key UNIQUE (user_id, purpose);
