-- Multi-user accounts (M8): sign-in by e-mail, e-mail verification, password reset and e-mail change by single-use
-- links. An account created before M8 has no e-mail until its owner adds one.

ALTER TABLE users
    ADD COLUMN email               text,
    ADD COLUMN email_verified_at   timestamptz,
    ADD COLUMN pending_email       text,
    ADD CONSTRAINT users_email_check CHECK (char_length(email) <= 254 AND email ~ '^[^@\s]+@[^@\s]+$'),
    ADD CONSTRAINT users_pending_email_check CHECK (char_length(pending_email) <= 254 AND pending_email ~ '^[^@\s]+@[^@\s]+$'),
    ADD CONSTRAINT users_email_verified_check CHECK (email_verified_at IS NULL OR email IS NOT NULL),
    ADD CONSTRAINT users_pending_email_verified_check CHECK (pending_email IS NULL OR email_verified_at IS NOT NULL);

COMMENT ON COLUMN users.email IS 'Sign-in address as entered; unique regardless of case. NULL only for the account of the single-user instance before M8';
COMMENT ON COLUMN users.email_verified_at IS 'When the owner confirmed the address by the link sent to it; password resets go to verified addresses only';
COMMENT ON COLUMN users.pending_email IS 'New address of an e-mail change; it replaces email once confirmed by the link sent to it';

CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE account_tokens (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose    text        NOT NULL CHECK (purpose IN ('verify_email', 'change_email', 'reset_password')),
    token_hash text        NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    email      text        NOT NULL,
    created_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    CHECK (expires_at > created_at)
);

COMMENT ON TABLE account_tokens IS 'Unused links of verification, e-mail change and password reset mails; a link is deleted when used';
COMMENT ON COLUMN account_tokens.token_hash IS 'SHA-256 (hex) of the token in the link; the token itself is never stored';
COMMENT ON COLUMN account_tokens.email IS 'The address the link was sent to; the link is void once the account no longer has it';

CREATE INDEX account_tokens_user_purpose_idx ON account_tokens (user_id, purpose);
