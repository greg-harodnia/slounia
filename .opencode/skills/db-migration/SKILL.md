---
name: DB migration
description: Apply a database change by updating supabase-schema.sql and adding an incremental Supabase migration
---

# Database migration

The database has two sources of truth that must stay in sync (see the rule in `AGENTS.md`):

- `supabase-schema.sql` — the full schema, run for a **fresh** database.
- `supabase/migrations/YYYYMMDD_<description>.sql` — incremental changes applied to existing databases.

## Steps

1. Make the change in `supabase-schema.sql` (table, index, function, RLS policy, seed data, …).
2. Add a matching file at `supabase/migrations/$(date +%Y%m%d)_<snake_case_description>.sql` containing only the new change. Write it to be **idempotent** (`IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO NOTHING`) so re-running is safe.
3. If the change touches `get_words` or search/sort behaviour, keep it mirrored with the client logic in `src/lib/word-search.ts` — the SQL RPC and the client must agree (see `docs/PROJECT.md`).
4. If a TypeScript constant mirrors a database value (e.g. importance levels in `src/lib/constants.ts`), update it too.
5. Run `bun run check` and `bun run test`, and update `docs/PROJECT.md` if behaviour changed.
