-- Add created_at to word query responses (no schema change needed, column already exists)

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
				s.is_pinned,
				s.created_at,
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

CREATE OR REPLACE FUNCTION get_word_by_id(word_id TEXT)
RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE result JSON;
BEGIN
	SELECT json_build_object(
		'id', w.id,
		'comment', w.comment,
		'likes', w.likes,
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
