-- Streak reminders by web push (M9, PRD F9): the push subscriptions of the learner's devices, the reminder settings and
-- the reminders sent. They belong to the devices and the notification setup on this instance rather than to the
-- learning state: the export leaves them out and an import keeps the importing account's ones.

CREATE TABLE push_subscriptions (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    endpoint        text        NOT NULL UNIQUE CHECK (char_length(endpoint) <= 2048),
    p256dh          text        NOT NULL CHECK (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
    auth            text        NOT NULL CHECK (auth ~ '^[A-Za-z0-9_-]{22}$'),
    label           text        CHECK (char_length(label) BETWEEN 1 AND 100),
    created_at      timestamptz NOT NULL,
    last_success_at timestamptz,
    failure_count   integer     NOT NULL DEFAULT 0 CHECK (failure_count >= 0)
);

COMMENT ON TABLE push_subscriptions IS 'Web push subscriptions, one per browser and device, that reminders are sent to';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL of the push service for the subscription; another account signing in on the device takes it over';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'P-256 public key (uncompressed point, URL-safe Base64) the messages are encrypted for';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret (16 bytes, URL-safe Base64) of the message encryption';
COMMENT ON COLUMN push_subscriptions.label IS 'Name of the device for the settings, e.g. "Chrome auf Android"';
COMMENT ON COLUMN push_subscriptions.failure_count IS 'Failed deliveries since the last successful one; a subscription the push service reports as gone is deleted';

CREATE INDEX push_subscriptions_user_idx ON push_subscriptions (user_id);

CREATE TABLE reminder_settings (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    enabled        boolean     NOT NULL,
    daily_time     time(0)     NOT NULL,
    rescue_enabled boolean     NOT NULL,
    rescue_time    time(0)     NOT NULL,
    updated_at     timestamptz NOT NULL,
    CHECK (NOT rescue_enabled OR rescue_time > daily_time)
);

COMMENT ON TABLE reminder_settings IS 'Reminders of the learner; without a row they are off (daily 19:00, rescue 21:30)';
COMMENT ON COLUMN reminder_settings.daily_time IS 'Wall-clock time of the daily reminder in the learner''s time zone';
COMMENT ON COLUMN reminder_settings.rescue_time IS 'Wall-clock time of the streak rescue, sent only while missing today would end the streak';

CREATE TABLE reminder_log (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day               date        NOT NULL,
    kind              text        NOT NULL CHECK (kind IN ('daily_reminder', 'streak_at_risk')),
    sent_at           timestamptz NOT NULL,
    sends             integer     NOT NULL DEFAULT 1 CHECK (sends >= 1),
    devices           integer     NOT NULL DEFAULT 0 CHECK (devices >= 0),
    delivered         integer     NOT NULL DEFAULT 0 CHECK (delivered BETWEEN 0 AND devices),
    snooze_token_hash text        UNIQUE CHECK (snooze_token_hash ~ '^[0-9a-f]{64}$'),
    snooze_expires_at timestamptz,
    snoozed_until     timestamptz,
    UNIQUE (user_id, day, kind),
    CHECK ((snooze_token_hash IS NULL) = (snooze_expires_at IS NULL))
);

COMMENT ON TABLE reminder_log IS 'Reminders sent, at most one row per kind and day, so that a restart never sends one twice';
COMMENT ON COLUMN reminder_log.day IS 'Date in the learner''s time zone';
COMMENT ON COLUMN reminder_log.sends IS 'How often it was sent: once, plus once per snooze';
COMMENT ON COLUMN reminder_log.devices IS 'Subscriptions the last send went to';
COMMENT ON COLUMN reminder_log.snooze_token_hash IS 'SHA-256 (hex) of the snooze token in the last notification; the token itself is never stored';
COMMENT ON COLUMN reminder_log.snoozed_until IS 'When the learner wants the reminder again; cleared when it is sent again';

CREATE INDEX reminder_log_day_idx ON reminder_log (day);
