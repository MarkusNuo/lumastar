-- Lingora schema (PRD 8.2). Learner data carries user_id (single-user instance, multi-user ready);
-- content tables are global and managed by the seed import from /content.
-- Enumerations are text columns with CHECK constraints and use the external codes of the content format.

-- ---------------------------------------------------------------------------------------------------------
-- Code sets used by several tables (extend them with CREATE OR REPLACE FUNCTION in a later migration)
-- ---------------------------------------------------------------------------------------------------------

CREATE FUNCTION is_level_code(code text) RETURNS boolean
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
RETURN code IN ('A0', 'A1.1', 'A1.2', 'A1.3', 'A2.1', 'A2.2', 'A2.3', 'B1.1', 'B1.2', 'B1.3',
                'B2.1', 'B2.2', 'B2.3', 'C1.1', 'C1.2', 'C1.3', 'C2.1', 'C2.2', 'C2.3');

CREATE FUNCTION is_exercise_type(code text) RETURNS boolean
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
RETURN code IN ('multiple_choice', 'translate_wordbank', 'translate_free', 'fill_gap', 'match_pairs', 'word_order',
                'conjugation_drill', 'declension_drill', 'reading', 'free_writing', 'listen_select');

CREATE FUNCTION is_error_category(code text) RETURNS boolean
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
RETURN code IN ('vocab.unknown', 'vocab.confused', 'spelling.diacritics', 'spelling.nasal_vowel', 'spelling.other',
                'variant.standard_form', 'grammar.definite_article', 'grammar.case', 'grammar.linking_article',
                'grammar.gender', 'grammar.infinitive', 'grammar.participle', 'grammar.verb_conjugation',
                'grammar.verb_tense', 'grammar.word_order', 'grammar.clitics');

CREATE FUNCTION is_outcome(code text) RETURNS boolean
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
RETURN code IN ('correct', 'almost_correct', 'correct_standard_form', 'wrong');

-- ---------------------------------------------------------------------------------------------------------
-- Learner account
-- ---------------------------------------------------------------------------------------------------------

CREATE TABLE users (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name            text        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
    password_hash           text        NOT NULL,
    motivations             text[]      NOT NULL DEFAULT '{}'
        CHECK (motivations <@ ARRAY ['family', 'travel', 'work', 'heritage', 'interest']),
    daily_goal_minutes      integer     NOT NULL DEFAULT 10 CHECK (daily_goal_minutes IN (5, 10, 15, 20)),
    self_assessment         text,
    current_level           text        CHECK (is_level_code(current_level)),
    xp_total                integer     NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
    time_zone               text        NOT NULL DEFAULT 'Europe/Zurich',
    settings                jsonb       NOT NULL DEFAULT '{}',
    onboarding_completed_at timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN users.self_assessment IS 'Onboarding self-assessment; its code set is defined with the onboarding (M3)';
COMMENT ON COLUMN users.settings IS 'Preferences, e.g. requestRetention (FSRS, default 0.90), sounds, haptics';

CREATE TABLE streaks (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    current_days        integer     NOT NULL DEFAULT 0 CHECK (current_days >= 0),
    longest_days        integer     NOT NULL DEFAULT 0,
    last_active_date    date,
    freezes_available   integer     NOT NULL DEFAULT 1 CHECK (freezes_available >= 0),
    freezes_refilled_on date,
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CHECK (longest_days >= current_days)
);

-- ---------------------------------------------------------------------------------------------------------
-- Content (global, seeded from /content; rows removed from the files are retired, never deleted)
-- ---------------------------------------------------------------------------------------------------------

CREATE TABLE content_skill_tags (
    id         text PRIMARY KEY CHECK (id ~ '^(vocab|phrase|grammar|spelling|reading)(\.[a-z0-9_]+)+$'),
    label      text NOT NULL,
    area       text NOT NULL CHECK (area IN ('vocab', 'phrase', 'grammar', 'spelling', 'reading')),
    retired_at timestamptz
);

CREATE TABLE content_stages (
    level      text    PRIMARY KEY CHECK (is_level_code(level)),
    title      text    NOT NULL,
    position   integer NOT NULL CHECK (position >= 0),
    retired_at timestamptz
);

CREATE TABLE content_units (
    id                text    PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_]*$'),
    level             text    NOT NULL REFERENCES content_stages (level),
    position          integer NOT NULL CHECK (position >= 0),
    title             text    NOT NULL,
    description       text,
    goals             text[]  NOT NULL DEFAULT '{}',
    skill_tags        text[]  NOT NULL DEFAULT '{}',
    color             text    CHECK (color IN ('violet', 'teal', 'sky', 'rose', 'amber', 'lime', 'indigo', 'coral')),
    icon              text,
    estimated_lessons integer CHECK (estimated_lessons > 0),
    grammar           jsonb   NOT NULL DEFAULT '[]',
    has_content       boolean NOT NULL DEFAULT false,
    retired_at        timestamptz
);

COMMENT ON COLUMN content_units.position IS 'Path order across the whole curriculum';
COMMENT ON COLUMN content_units.has_content IS 'false for skeleton units without exercises (B1-C2 in the MVP)';

CREATE INDEX content_units_level_position_idx ON content_units (level, position);

CREATE TABLE content_items (
    id             text    PRIMARY KEY CHECK (id ~ '^item_[a-z0-9_]+$'),
    unit_id        text    NOT NULL REFERENCES content_units (id),
    kind           text    NOT NULL CHECK (kind IN ('word', 'phrase', 'grammar')),
    gheg           text    NOT NULL,
    de             text    NOT NULL,
    part_of_speech text    CHECK (part_of_speech IN ('noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition',
        'conjunction', 'numeral', 'interjection', 'particle', 'phrase', 'other')),
    gender         text    CHECK (gender IN ('m', 'f', 'n')),
    definite       text,
    plural         text,
    alternatives   text[]  NOT NULL DEFAULT '{}',
    note           text,
    reviewed       boolean NOT NULL DEFAULT false,
    retired_at     timestamptz
);

CREATE INDEX content_items_unit_idx ON content_items (unit_id);

CREATE TABLE exercises (
    id            text        PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_]*$'),
    pool          text        NOT NULL CHECK (pool IN ('lesson', 'placement')),
    unit_id       text        REFERENCES content_units (id),
    type          text        NOT NULL CHECK (is_exercise_type(type)),
    level         text        NOT NULL CHECK (is_level_code(level)),
    difficulty    integer     NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
    skill_tags    text[]      NOT NULL CHECK (cardinality(skill_tags) >= 1),
    item_ids      text[]      NOT NULL DEFAULT '{}',
    competence    text        CHECK (competence IN ('vocabulary', 'grammar', 'reading', 'translation')),
    prompt_lang   text        NOT NULL CHECK (prompt_lang IN ('sq', 'de')),
    prompt_text   text        NOT NULL,
    explanation   text,
    error_hints   jsonb       NOT NULL DEFAULT '[]',
    payload       jsonb       NOT NULL,
    source        text        NOT NULL CHECK (source IN ('manual', 'ai')),
    owner_user_id uuid        REFERENCES users (id) ON DELETE CASCADE,
    reviewed      boolean     NOT NULL DEFAULT false,
    note          text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    retired_at    timestamptz,
    CHECK (owner_user_id IS NULL OR source = 'ai')
);

COMMENT ON COLUMN exercises.payload IS 'Type-specific fields of docs/CONTENT_FORMAT.md (choices, solutions, wordBank, ...)';
COMMENT ON COLUMN exercises.owner_user_id IS 'Set for AI exercises generated for one learner (Phase 2); NULL for global content';

CREATE INDEX exercises_unit_idx ON exercises (unit_id) WHERE retired_at IS NULL;
CREATE INDEX exercises_pool_level_idx ON exercises (pool, level) WHERE retired_at IS NULL;
CREATE INDEX exercises_skill_tags_idx ON exercises USING gin (skill_tags);
CREATE INDEX exercises_owner_idx ON exercises (owner_user_id) WHERE owner_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------------------------
-- Placement test (PRD F2)
-- ---------------------------------------------------------------------------------------------------------

CREATE TABLE placement_tests (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status        text        NOT NULL CHECK (status IN ('in_progress', 'completed', 'skipped', 'abandoned')),
    engine        text        NOT NULL,
    start_level   text        NOT NULL CHECK (is_level_code(start_level)),
    current_level text        NOT NULL CHECK (is_level_code(current_level)),
    result_level  text        CHECK (is_level_code(result_level)),
    state         jsonb       NOT NULL DEFAULT '{}',
    result        jsonb,
    started_at    timestamptz NOT NULL DEFAULT now(),
    finished_at   timestamptz,
    CHECK (status NOT IN ('completed', 'skipped') OR (result_level IS NOT NULL AND finished_at IS NOT NULL))
);

COMMENT ON COLUMN placement_tests.state IS 'Engine state snapshot, e.g. correct streak and level reversals';
COMMENT ON COLUMN placement_tests.result IS 'Initial mastery per skill tag, top strengths and weaknesses';

CREATE INDEX placement_tests_user_idx ON placement_tests (user_id, started_at DESC);
CREATE UNIQUE INDEX placement_tests_one_open_per_user_idx ON placement_tests (user_id) WHERE status = 'in_progress';

CREATE TABLE placement_answers (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    placement_test_id uuid        NOT NULL REFERENCES placement_tests (id) ON DELETE CASCADE,
    position          integer     NOT NULL CHECK (position >= 1),
    exercise_id       text        NOT NULL REFERENCES exercises (id),
    level             text        NOT NULL CHECK (is_level_code(level)),
    competence        text        CHECK (competence IN ('vocabulary', 'grammar', 'reading', 'translation')),
    answer            jsonb       NOT NULL,
    outcome           text        NOT NULL CHECK (is_outcome(outcome)),
    error_category    text        CHECK (is_error_category(error_category)),
    response_ms       integer     CHECK (response_ms >= 0),
    answered_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (placement_test_id, position)
);

-- ---------------------------------------------------------------------------------------------------------
-- Learning plan (PRD F3)
-- ---------------------------------------------------------------------------------------------------------

CREATE TABLE learning_plans (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    version      integer     NOT NULL CHECK (version >= 1),
    generated_by text        NOT NULL,
    plan         jsonb       NOT NULL,
    valid_from   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, version)
);

COMMENT ON COLUMN learning_plans.plan IS 'Plan document as exported in learning_plan.json';

CREATE TABLE plan_changes (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    plan_id      uuid        NOT NULL REFERENCES learning_plans (id) ON DELETE CASCADE,
    triggered_by text        NOT NULL CHECK (triggered_by IN ('placement', 'checkpoint', 'periodic', 'lesson', 'manual')),
    kind         text        NOT NULL CHECK (kind IN ('plan_created', 'focus_inserted', 'unit_skipped', 'unit_shortened',
        'level_changed', 'replanned')),
    reason       text        NOT NULL,
    details      jsonb       NOT NULL DEFAULT '{}',
    created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN plan_changes.reason IS 'German explanation shown in the plan history, e.g. the error rate that caused a focus lesson';

CREATE INDEX plan_changes_user_idx ON plan_changes (user_id, created_at DESC);

-- ---------------------------------------------------------------------------------------------------------
-- Lessons and answers (PRD F5-F7)
-- ---------------------------------------------------------------------------------------------------------

CREATE TABLE sessions (
    id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind             text          NOT NULL CHECK (kind IN ('lesson', 'focus', 'review', 'checkpoint', 'practice')),
    unit_id          text          REFERENCES content_units (id),
    level            text          CHECK (is_level_code(level)),
    focus_skill_tags text[]        NOT NULL DEFAULT '{}',
    composed_by      text          NOT NULL,
    exercise_ids     text[]        NOT NULL DEFAULT '{}',
    started_at       timestamptz   NOT NULL DEFAULT now(),
    finished_at      timestamptz,
    exercise_count   integer       CHECK (exercise_count >= 0),
    correct_count    integer       CHECK (correct_count >= 0),
    accuracy         numeric(4, 3) CHECK (accuracy BETWEEN 0 AND 1),
    xp_earned        integer       NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
    CHECK (finished_at >= started_at),
    CHECK (correct_count <= exercise_count)
);

COMMENT ON TABLE sessions IS 'One row per lesson (learning sessions, not HTTP sessions)';
COMMENT ON COLUMN sessions.exercise_ids IS 'Exercises as composed at lesson start';

CREATE INDEX sessions_user_started_idx ON sessions (user_id, started_at DESC);

CREATE TABLE attempts (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    session_id     uuid        NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    position       integer     NOT NULL CHECK (position >= 1),
    exercise_id    text        NOT NULL REFERENCES exercises (id),
    exercise_type  text        NOT NULL CHECK (is_exercise_type(exercise_type)),
    skill_tags     text[]      NOT NULL,
    is_retry       boolean     NOT NULL DEFAULT false,
    answer         jsonb       NOT NULL,
    outcome        text        NOT NULL CHECK (is_outcome(outcome)),
    error_category text        CHECK (is_error_category(error_category)),
    fsrs_rating    text        CHECK (fsrs_rating IN ('again', 'hard', 'good', 'easy')),
    response_ms    integer     NOT NULL CHECK (response_ms >= 0),
    evaluated_by   text        NOT NULL,
    answered_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id, position)
);

COMMENT ON COLUMN attempts.skill_tags IS 'Snapshot of the exercise tags at answer time, for error analytics';
COMMENT ON COLUMN attempts.is_retry IS 'Wrong exercise repeated at the end of the lesson (PRD F5)';

-- Error rate per skill tag over the last 14 days and the latest errors (PRD F7, F10, recent_errors.json)
CREATE INDEX attempts_user_answered_idx ON attempts (user_id, answered_at DESC);
CREATE INDEX attempts_user_errors_idx ON attempts (user_id, answered_at DESC) WHERE outcome = 'wrong';
CREATE INDEX attempts_skill_tags_idx ON attempts USING gin (skill_tags);
CREATE INDEX attempts_exercise_idx ON attempts (exercise_id);

CREATE TABLE skill_mastery (
    id                uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid             NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    skill_tag         text             NOT NULL REFERENCES content_skill_tags (id),
    mastery           double precision NOT NULL CHECK (mastery BETWEEN 0 AND 1),
    attempts          integer          NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    correct           integer          NOT NULL DEFAULT 0 CHECK (correct >= 0),
    last_practiced_at timestamptz,
    updated_at        timestamptz      NOT NULL DEFAULT now(),
    UNIQUE (user_id, skill_tag),
    CHECK (correct <= attempts)
);

CREATE INDEX skill_mastery_user_mastery_idx ON skill_mastery (user_id, mastery);

-- ---------------------------------------------------------------------------------------------------------
-- Spaced repetition with FSRS (PRD F8)
-- ---------------------------------------------------------------------------------------------------------

CREATE TABLE fsrs_params (
    id                uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid               NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    version           integer            NOT NULL CHECK (version >= 1),
    scheduler_version text               NOT NULL,
    weights           double precision[] NOT NULL,
    review_count      integer            NOT NULL CHECK (review_count >= 0),
    metrics           jsonb              NOT NULL DEFAULT '{}',
    active            boolean            NOT NULL DEFAULT true,
    created_at        timestamptz        NOT NULL DEFAULT now(),
    UNIQUE (user_id, version)
);

COMMENT ON COLUMN fsrs_params.review_count IS 'Number of review_log rows the weights were optimised on';

CREATE UNIQUE INDEX fsrs_params_one_active_per_user_idx ON fsrs_params (user_id) WHERE active;

CREATE TABLE srs_cards (
    id          uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid             NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    item_id     text             NOT NULL REFERENCES content_items (id),
    state       text             NOT NULL CHECK (state IN ('new', 'learning', 'review', 'relearning')),
    step        integer          CHECK (step >= 0),
    stability   double precision CHECK (stability > 0),
    difficulty  double precision CHECK (difficulty BETWEEN 1 AND 10),
    due         timestamptz      NOT NULL,
    last_review timestamptz,
    reps        integer          NOT NULL DEFAULT 0 CHECK (reps >= 0),
    lapses      integer          NOT NULL DEFAULT 0 CHECK (lapses >= 0),
    created_at  timestamptz      NOT NULL DEFAULT now(),
    UNIQUE (user_id, item_id),
    CHECK (lapses <= reps)
);

CREATE INDEX srs_cards_user_due_idx ON srs_cards (user_id, due);

CREATE TABLE review_log (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    card_id           uuid        NOT NULL REFERENCES srs_cards (id) ON DELETE CASCADE,
    item_id           text        NOT NULL REFERENCES content_items (id),
    attempt_id        uuid        REFERENCES attempts (id) ON DELETE SET NULL,
    rating            text        NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
    reviewed_at       timestamptz NOT NULL,
    response_ms       integer     CHECK (response_ms >= 0),
    state_before      jsonb       NOT NULL,
    state_after       jsonb       NOT NULL,
    scheduler_version text        NOT NULL,
    fsrs_params_id    uuid        REFERENCES fsrs_params (id) ON DELETE SET NULL
);

COMMENT ON TABLE review_log IS 'Every FSRS review; source for parameter optimisation and for replaying a scheduler change';

CREATE INDEX review_log_user_reviewed_idx ON review_log (user_id, reviewed_at);
CREATE INDEX review_log_card_reviewed_idx ON review_log (card_id, reviewed_at);

-- ---------------------------------------------------------------------------------------------------------
-- AI requests (Phase 2, PRD 10.4)
-- ---------------------------------------------------------------------------------------------------------

CREATE TABLE ai_requests (
    id            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    task          text           NOT NULL CHECK (task IN ('placement', 'plan', 'generate_exercises', 'evaluate_free_text', 'explain')),
    provider      text           NOT NULL,
    model         text           NOT NULL,
    status        text           NOT NULL CHECK (status IN ('success', 'cached', 'invalid_response', 'failed', 'rate_limited')),
    cache_key     text,
    request       jsonb,
    response      jsonb,
    input_tokens  integer        CHECK (input_tokens >= 0),
    output_tokens integer        CHECK (output_tokens >= 0),
    cost_usd      numeric(12, 6) CHECK (cost_usd >= 0),
    latency_ms    integer        CHECK (latency_ms >= 0),
    error         text,
    created_at    timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX ai_requests_user_created_idx ON ai_requests (user_id, created_at DESC);
CREATE INDEX ai_requests_cache_key_idx ON ai_requests (cache_key) WHERE cache_key IS NOT NULL;
