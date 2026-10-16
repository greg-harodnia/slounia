-- Admins (dev mode) can attach a single moderation comment to a word
-- suggestion. It is public: the suggestion list already exposes every
-- suggestion (including this column) to anon, and the note explains the
-- admin's decision on the proposal.

ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS admin_comment TEXT;
