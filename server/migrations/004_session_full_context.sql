-- Add missing assessment fields and archived flag to sessions
ALTER TABLE sessions ADD COLUMN assessment_method TEXT;
ALTER TABLE sessions ADD COLUMN slider_responses_json TEXT;
ALTER TABLE sessions ADD COLUMN score_rationale TEXT;
ALTER TABLE sessions ADD COLUMN user_modalities_json TEXT;
ALTER TABLE sessions ADD COLUMN user_modalities_other TEXT;
ALTER TABLE sessions ADD COLUMN user_context TEXT;
ALTER TABLE sessions ADD COLUMN probing_messages_json TEXT;
ALTER TABLE sessions ADD COLUMN socratic_messages_json TEXT;
ALTER TABLE sessions ADD COLUMN archived INTEGER DEFAULT 0;
