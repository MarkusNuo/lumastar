-- Onboarding (PRD F1): the self-assessment sets the start level of the first placement test.

ALTER TABLE users
    ADD CONSTRAINT users_self_assessment_check CHECK (self_assessment IN
        ('nothing', 'few_words', 'simple_sentences', 'everyday_conversation', 'understand_much'));

COMMENT ON COLUMN users.self_assessment IS 'Onboarding self-assessment; it sets the start level of the first placement test';
