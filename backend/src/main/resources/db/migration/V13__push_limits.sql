-- M9 review: a snooze token works once, and a device whose deliveries keep failing is removed.

COMMENT ON COLUMN push_subscriptions.failure_count IS 'Failed deliveries since the last successful one; the subscription is deleted after lingora.push.max-failures of them in a row, or at once when the push service reports it as gone';
COMMENT ON COLUMN reminder_log.snooze_token_hash IS 'SHA-256 (hex) of the snooze token in the last notification, cleared once the token is used; the token itself is never stored';
