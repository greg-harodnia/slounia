-- Run this in Supabase SQL Editor for a fresh database

CREATE TABLE IF NOT EXISTS importance (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	level INTEGER NOT NULL UNIQUE
);

INSERT INTO importance (name, level) VALUES
	('Сынонімы', -2),
	('Трасянка', -1),
	('Уважліва', 0),
	('Можна лепей', 1),
	('Нязграба', 2),
	('Недарэка', 3),
	('Жах', 4),
	('Паўсюдны жах', 5)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS tags (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS words (
	id TEXT PRIMARY KEY,
	importance_id INTEGER REFERENCES importance(id),
	comment TEXT,
	likes INTEGER DEFAULT 0,
	views INTEGER DEFAULT 0,
	hidden BOOLEAN DEFAULT false,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS word_tags (
	word_id TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE ON UPDATE CASCADE,
	tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY (word_id, tag_id)
);

CREATE TABLE IF NOT EXISTS translations (
	id SERIAL PRIMARY KEY,
	word_id TEXT REFERENCES words(id) ON DELETE CASCADE ON UPDATE CASCADE,
	translation TEXT NOT NULL,
	comment TEXT,
	sort_order INTEGER DEFAULT 0,
	likes INTEGER DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    telegram TEXT,
    message TEXT NOT NULL,
    user_token TEXT,
    reply TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
    code TEXT PRIMARY KEY,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banned_users (
    id SERIAL PRIMARY KEY,
    user_token TEXT,
    name TEXT,
    telegram TEXT,
    reason TEXT,
    ip_address TEXT,
    message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    banned_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banned_users_user_token ON banned_users(user_token);
CREATE INDEX IF NOT EXISTS idx_banned_users_name ON banned_users(name);
CREATE INDEX IF NOT EXISTS idx_banned_users_telegram ON banned_users(telegram);
CREATE INDEX IF NOT EXISTS idx_banned_users_ip ON banned_users(ip_address);

CREATE OR REPLACE FUNCTION increment_word_likes(word_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE new_likes INTEGER;
BEGIN
  UPDATE words SET likes = likes + 1 WHERE id = word_id RETURNING likes INTO new_likes;
  RETURN new_likes;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_word_likes(word_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE new_likes INTEGER;
BEGIN
  UPDATE words SET likes = GREATEST(likes - 1, 0) WHERE id = word_id RETURNING likes INTO new_likes;
  RETURN new_likes;
END;
$$;

CREATE OR REPLACE FUNCTION increment_translation_likes(trans_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE new_likes INTEGER;
BEGIN
  UPDATE translations SET likes = likes + 1 WHERE id = trans_id RETURNING likes INTO new_likes;
  RETURN new_likes;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_translation_likes(trans_id INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE new_likes INTEGER;
BEGIN
  UPDATE translations SET likes = GREATEST(likes - 1, 0) WHERE id = trans_id RETURNING likes INTO new_likes;
  RETURN new_likes;
END;
$$;

CREATE OR REPLACE FUNCTION increment_referral(ref_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE new_clicks INTEGER;
BEGIN
  INSERT INTO referrals (code, clicks) VALUES (ref_code, 1)
  ON CONFLICT (code) DO UPDATE SET clicks = referrals.clicks + 1
  RETURNING clicks INTO new_clicks;
  RETURN new_clicks;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_last_tag_removal()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM words WHERE id = OLD.word_id) THEN
    RETURN OLD;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM word_tags WHERE word_id = OLD.word_id AND tag_id != OLD.tag_id) THEN
    RAISE EXCEPTION 'Word must have at least one tag';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER word_tags_last_tag_check
  BEFORE DELETE ON word_tags
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_tag_removal();

-- this is only needed because words are used as IDs without a unique and consistent word ID
CREATE OR REPLACE FUNCTION update_crossrefs_on_word_rename()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    UPDATE translations
    SET translation = regexp_replace(
      translation,
      '^((?:гл|параўн)\.\s+).*$',
      '\1' || NEW.id,
      'i'
    )
    WHERE translation ~* '^((?:гл|параўн)\.\s+).*$'
      AND lower(regexp_replace(translation, '^((?:гл|параўн)\.\s+)', '', 'i')) = lower(OLD.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER words_crossrefs_after_rename
  AFTER UPDATE OF id ON words
  FOR EACH ROW
  EXECUTE FUNCTION update_crossrefs_on_word_rename();

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION normalize_text(s TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT TRANSLATE(
    REPLACE(REPLACE(REPLACE(REPLACE(LOWER(s), '’', ''), CHR(39), ''), '`', ''), CHR(769), ''),
    'ёиiугэ',
    'еііўґе'
  );
$$;

CREATE INDEX IF NOT EXISTS idx_translations_normalized_trgm ON translations USING gin (normalize_text(translation) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_words_normalized_trgm ON words USING gin (normalize_text(id) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_translations_word_id ON translations(word_id);

CREATE OR REPLACE FUNCTION get_words(
	search TEXT DEFAULT '',
	tag_filter TEXT DEFAULT '',
	sort_field TEXT DEFAULT 'word',
	sort_dir TEXT DEFAULT 'desc',
	result_offset INTEGER DEFAULT 0,
	result_limit INTEGER DEFAULT 100000,
	word_ids TEXT[] DEFAULT NULL,
	include_hidden BOOLEAN DEFAULT false,
	pinned_only BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE result JSON;
BEGIN
	WITH filtered AS (
		SELECT
			w.id,
			w.importance_id,
			w.comment,
			w.likes,
			w.views,
			w.created_at,
			w.hidden,
			w.is_pinned,
			w.pinned_at,
			i.id AS imp_id,
			i.name AS imp_name,
			i.level AS imp_level,
			CASE
				WHEN sort_field = 'importance' THEN COALESCE(i.level::text, '0')
				WHEN sort_field = 'likes' THEN LPAD(w.likes::text, 10, '0')
				WHEN sort_field = 'created_at' THEN COALESCE(to_char(w.created_at, 'YYYYMMDDHH24MISS'), '0')
				WHEN sort_field = 'pinned_at' THEN COALESCE(to_char(w.pinned_at, 'YYYYMMDDHH24MISS'), '0')
				ELSE LOWER(w.id)
			END AS sort_expr,
			CASE
				WHEN search = '' THEN 0::real
				ELSE COALESCE((
					SELECT SUM(
						GREATEST(
							CASE WHEN normalize_text(w.id) LIKE '%' || normalize_text(term) || '%'
								THEN COALESCE(similarity(normalize_text(w.id), normalize_text(term)), 0) * 2
								ELSE 0
							END,
							COALESCE((
								SELECT MAX(similarity(normalize_text(t.translation), normalize_text(term)))
								FROM translations t
								WHERE t.word_id = w.id AND normalize_text(t.translation) LIKE '%' || normalize_text(term) || '%'
							), 0)
						)
					) FROM unnest(string_to_array(search, ' ')) AS term
				), 0::real)
			END AS relevance_score
		FROM words w
		LEFT JOIN importance i ON w.importance_id = i.id
		WHERE (
			search = ''
			OR (
				SELECT bool_and(
					normalize_text(w.id) LIKE '%' || normalize_text(term) || '%'
					OR EXISTS (
						SELECT 1 FROM translations t
						WHERE t.word_id = w.id AND normalize_text(t.translation) LIKE '%' || normalize_text(term) || '%'
					)
				)
				FROM unnest(string_to_array(search, ' ')) AS term
			)
		)
		AND (
			tag_filter = ''
			OR EXISTS (
				SELECT 1 FROM word_tags wt2
				JOIN tags tg2 ON wt2.tag_id = tg2.id
				WHERE wt2.word_id = w.id AND tg2.name = ANY(string_to_array(tag_filter, ','))
			)
		)
		AND (word_ids IS NULL OR w.id = ANY(word_ids))
		AND (include_hidden OR NOT COALESCE(w.hidden, false))
		AND (NOT pinned_only OR w.is_pinned = true)
	),
	sorted AS (
		SELECT * FROM filtered
		ORDER BY
			CASE WHEN sort_field = 'relevance' THEN relevance_score END DESC NULLS LAST,
			CASE WHEN sort_field != 'relevance' AND sort_dir = 'asc' THEN sort_expr END ASC NULLS LAST,
			CASE WHEN sort_field != 'relevance' AND sort_dir = 'desc' THEN sort_expr END DESC NULLS LAST,
			LOWER(id)
		OFFSET result_offset
		LIMIT result_limit
	)
	-- Aggregate translations and tags set-based (one GROUP BY scan per table,
	-- restricted to the already-paginated rows) instead of two correlated
	-- subqueries per returned word.
	,
	trans_agg AS (
		SELECT t.word_id,
			json_agg(
				json_build_object(
					'id', t.id,
					'translation', t.translation,
					'comment', t.comment,
					'likes', t.likes
				) ORDER BY t.sort_order, t.id
			) AS translations
		FROM translations t
		WHERE t.word_id IN (SELECT id FROM sorted)
		GROUP BY t.word_id
	),
	tag_agg AS (
		SELECT wt.word_id,
			json_agg(tg.name) AS tags
		FROM word_tags wt
		JOIN tags tg ON wt.tag_id = tg.id
		WHERE wt.word_id IN (SELECT id FROM sorted)
		GROUP BY wt.word_id
	)
	SELECT json_build_object(
		'words', COALESCE((SELECT json_agg(row_to_json(subq)) FROM (
			SELECT
				s.id,
				s.comment,
				s.likes,
				s.views,
				s.hidden,
				s.is_pinned,
				s.created_at,
				json_build_object('id', s.imp_id, 'name', s.imp_name, 'level', s.imp_level) AS importance,
				COALESCE(ta.translations, '[]'::json) AS translations,
				COALESCE(tga.tags, '[]'::json) AS tags
			FROM sorted s
			LEFT JOIN trans_agg ta ON ta.word_id = s.id
			LEFT JOIN tag_agg tga ON tga.word_id = s.id
		) subq), '[]'::json),
		'total', (SELECT COUNT(*) FROM filtered)
	) INTO result;

	RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_word_by_id(word_id TEXT)
RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE result JSON;
BEGIN
	SELECT json_build_object(
		'id', w.id,
		'comment', w.comment,
		'likes', w.likes,
		'views', w.views,
		'hidden', w.hidden,
		'is_pinned', w.is_pinned,
		'created_at', w.created_at,
		'importance', json_build_object('id', i.id, 'name', i.name, 'level', i.level),
		'translations', COALESCE(
			(SELECT json_agg(
				json_build_object(
					'id', t.id,
					'translation', t.translation,
					'comment', t.comment,
					'likes', t.likes
				) ORDER BY t.sort_order, t.id
			) FROM translations t WHERE t.word_id = w.id),
			'[]'::json
		),
		'tags', COALESCE(
			(SELECT json_agg(tg.name)
			FROM word_tags wt
			JOIN tags tg ON wt.tag_id = tg.id
			WHERE wt.word_id = w.id),
			'[]'::json
		)
	)
	FROM words w
	LEFT JOIN importance i ON w.importance_id = i.id
	WHERE w.id = word_id
	INTO result;

	RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION reorder_translations(translation_ids INTEGER[], sort_orders INTEGER[])
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
	UPDATE translations
	SET sort_order = new_orders.sort_order
	FROM unnest(translation_ids, sort_orders) AS new_orders(id, sort_order)
	WHERE translations.id = new_orders.id;
END;
$$;

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    hashtags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0
);

INSERT INTO storage.buckets (id, name, public)
SELECT 'blog-images', 'blog-images', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'blog-images');

CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(is_pinned DESC);

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

ALTER TABLE words ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE words ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE words ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_words_pinned ON words(is_pinned DESC) WHERE is_pinned = true;

CREATE OR REPLACE FUNCTION increment_post_likes(post_slug TEXT)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE new_likes INTEGER;
BEGIN
  UPDATE posts SET likes = likes + 1 WHERE slug = post_slug RETURNING likes INTO new_likes;
  RETURN new_likes;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_post_likes(post_slug TEXT)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE new_likes INTEGER;
BEGIN
  UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE slug = post_slug RETURNING likes INTO new_likes;
  RETURN new_likes;
END;
$$;

CREATE OR REPLACE FUNCTION increment_word_views(word_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE new_views INTEGER;
BEGIN
  UPDATE words SET views = views + 1 WHERE id = word_id RETURNING views INTO new_views;
  RETURN new_views;
END;
$$;

CREATE OR REPLACE FUNCTION increment_post_views(post_slug TEXT)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE new_views INTEGER;
BEGIN
  UPDATE posts SET views = views + 1 WHERE slug = post_slug RETURNING views INTO new_views;
  RETURN new_views;
END;
$$;

-- Row Level Security
-- The anon key is public by design, so it may read public content only.
-- All writes go through the service-role key (getServiceClient in
-- src/lib/server/db.ts), which bypasses RLS.

ALTER TABLE importance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE words         ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_importance  ON importance;
DROP POLICY IF EXISTS anon_read_tags        ON tags;
DROP POLICY IF EXISTS anon_read_words       ON words;
DROP POLICY IF EXISTS anon_read_word_tags   ON word_tags;
DROP POLICY IF EXISTS anon_read_translations ON translations;
DROP POLICY IF EXISTS anon_read_posts       ON posts;
DROP POLICY IF EXISTS anon_read_suggestions ON suggestions;

CREATE POLICY anon_read_importance ON importance FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_tags ON tags FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_words ON words FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_word_tags ON word_tags FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_translations ON translations FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_posts ON posts FOR SELECT TO anon USING (true);
CREATE POLICY anon_read_suggestions ON suggestions FOR SELECT TO anon USING (true);
