-- Restrict anon reads so hidden (draft) words never leave the DB. The app
-- only shows hidden words in dev builds, which read through the service client.
DROP POLICY IF EXISTS anon_read_words       ON words;
DROP POLICY IF EXISTS anon_read_word_tags   ON word_tags;
DROP POLICY IF EXISTS anon_read_translations ON translations;

CREATE POLICY anon_read_words ON words FOR SELECT TO anon USING (NOT COALESCE(hidden, false));
CREATE POLICY anon_read_word_tags ON word_tags FOR SELECT TO anon USING (
	EXISTS (SELECT 1 FROM words w WHERE w.id = word_tags.word_id AND NOT COALESCE(w.hidden, false))
);
CREATE POLICY anon_read_translations ON translations FOR SELECT TO anon USING (
	EXISTS (SELECT 1 FROM words w WHERE w.id = translations.word_id AND NOT COALESCE(w.hidden, false))
);