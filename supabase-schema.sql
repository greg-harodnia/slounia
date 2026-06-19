-- Run this in Supabase SQL Editor for a fresh database

CREATE TABLE IF NOT EXISTS importance (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	level INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tags (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS words (
	id TEXT PRIMARY KEY,
	importance_id INTEGER REFERENCES importance(id),
	comment TEXT,
	likes INTEGER DEFAULT 0,
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
	include_hidden BOOLEAN DEFAULT false
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
			w.created_at,
			w.hidden,
			i.id AS imp_id,
			i.name AS imp_name,
			i.level AS imp_level,
			CASE
				WHEN sort_field = 'importance' THEN COALESCE(i.level::text, '0')
				WHEN sort_field = 'likes' THEN LPAD(w.likes::text, 10, '0')
				WHEN sort_field = 'created_at' THEN COALESCE(to_char(w.created_at, 'YYYYMMDDHH24MISS'), '0')
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
	),
	sorted AS (
		SELECT * FROM filtered
		ORDER BY
			CASE WHEN search != '' THEN relevance_score END DESC NULLS LAST,
			CASE WHEN sort_dir = 'asc' THEN sort_expr END ASC NULLS LAST,
			CASE WHEN sort_dir = 'desc' THEN sort_expr END DESC NULLS LAST,
			LOWER(id)
		OFFSET result_offset
		LIMIT result_limit
	)
	SELECT json_build_object(
		'words', COALESCE((SELECT json_agg(row_to_json(subq)) FROM (
			SELECT
				s.id,
				s.comment,
				s.likes,
				s.hidden,
				json_build_object('id', s.imp_id, 'name', s.imp_name, 'level', s.imp_level) AS importance,
				COALESCE(
					(SELECT json_agg(
						json_build_object(
							'id', t.id,
							'translation', t.translation,
							'comment', t.comment,
							'likes', t.likes
						) ORDER BY t.sort_order, t.id
					) FROM translations t WHERE t.word_id = s.id),
					'[]'::json
				) AS translations,
				COALESCE(
					(SELECT json_agg(tg.name)
					FROM word_tags wt
					JOIN tags tg ON wt.tag_id = tg.id
					WHERE wt.word_id = s.id),
					'[]'::json
				) AS tags
			FROM sorted s
		) subq), '[]'::json),
		'total', (SELECT COUNT(*) FROM filtered)
	) INTO result;

	RETURN result;
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
    likes INTEGER DEFAULT 0
);

INSERT INTO storage.buckets (id, name, public)
SELECT 'blog-images', 'blog-images', true
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'blog-images');

CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(is_pinned DESC);

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
