-- Word suggestions: users can suggest new words with translations and a comment,
-- admins resolve them (approved / rejected / agreed).

CREATE TABLE IF NOT EXISTS suggestions (
	id SERIAL PRIMARY KEY,
	word TEXT NOT NULL,
	translation TEXT NOT NULL,
	comment TEXT,
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'agreed')),
	user_token TEXT,
	published_at TIMESTAMPTZ DEFAULT NOW(),
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_published_at ON suggestions(published_at DESC);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_suggestions ON suggestions;
CREATE POLICY anon_read_suggestions ON suggestions FOR SELECT TO anon USING (true);
