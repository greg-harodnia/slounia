-- Pin explicit ids for the importance levels so a fresh database matches the
-- live one and src/lib/constants.ts. Previously the seed relied on SERIAL
-- insertion order, which produced different ids than production (where
-- importance_id = 5 is level 5 / Паўсюдны жах, used by the rotate-pinned-word
-- cron). Idempotent: existing rows keep their (already correct) values.
INSERT INTO importance (id, name, level) VALUES
	(8, 'Сынонімы', -2),
	(7, 'Трасянка', -1),
	(6, 'Уважліва', 0),
	(1, 'Можна лепей', 1),
	(2, 'Нязграба', 2),
	(3, 'Недарэка', 3),
	(4, 'Жах', 4),
	(5, 'Паўсюдны жах', 5)
ON CONFLICT (name) DO NOTHING;