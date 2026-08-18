# Слоўня — project documentation

Mostly for AI agents, but for humans as well.

## Overview

Слоўня (https://slounia.vercel.app) is a Belarusian dictionary that translates
words from the _official_ language standard back into the _natural_ language
and explains which words are artificial "калькі" (calques). It is a personal,
non-commercial project.

- **Stack**: SvelteKit 5 (runes mode) + Svelte 5, TypeScript, Supabase
  (Postgres + RLS + storage), deployed on Vercel (edge caching), PWA via
  `vite-plugin-pwa`.
- **Frontend model**: the entire dictionary (currently below 1000 words) is loaded at
  once on the homepage and filtered/sorted client-side. This is intentional and
  the reason `FULL_LIST_LIMIT = 100000` exists; server pagination isn't used for
  the dictionary. Search/sort/tag/favorites logic must stay mirrored between the
  SQL RPC (`get_words`) and the client (`word-search.ts`).

## End-user experience

### Homepage — the word list

The homepage is a full-page CSS-grid table with three columns: word, translation,
likes. It is rendered at SSR and hydrated client-side with interactive filtering.

- **Search** (`WordControls`): client-side, searches word IDs and translation text.
  Latin input is transliterated to Cyrillic (`latToCyr`) before matching; Matching
  is lenient via `normalizeText` (ё/э→е, stress stripped, apostrophes tolerated).
  Ctrl/Cmd+F focuses the input. URL-synced.
- **Sort**: by word (prod default, ascending), importance, likes, or date (dev
  default, descending). Uses ICU collation `localeCompare('be')` for Belarusian
  word order. Sort buttons are in the grid header (desktop) or pill toggles
  (mobile ≤640px).
- **Tag filter**: multi-select tag chips below search; toggling filters the list.
  URL-synced (comma-separated `tags` param).
- **Favorites**: heart icon toggles "show only liked words" mode.
- **Pinned "word of the week"**: shown at the top when no search/filter/sort is
  active; rotated weekly by cron (`importance_id = 5`).
- **Infinite scroll**: the full list is in memory; words render in pages of
  `PAGE_SIZE` (20) via an `IntersectionObserver` sentinel with a 1500px prefetch
  margin for smooth momentum scrolling.
- **Word rows**: each row shows the word (bold), an importance badge (color-coded
  by level), tag chips, translations (each with a like button), and a word-level
  like button. Words created in the last 7 days get a green "Новае" badge. Words
  with a `comment` show a visual indicator and a hover tooltip.
- **Łacinka toggle**: header button ("Ł" / "Ў") switches all translations to
  Belarusian Latin script (`cyrToLat`). Persisted in localStorage.
- **Mobile layout** (≤640px): rows become card-like (2-column grid with word
  spanning full width, translations below). Sort buttons become pill toggles.
- **Welcome modal**: shown on first visit, asks users to share the site link
  (with copy-to-clipboard). Dismissed permanently via localStorage.

### Word detail / overlay

Two display modes: an in-app overlay (SPA navigation from the word list) and a
standalone page (`/word/{id}`) for direct links and SEO.

- **Overlay** (`WordOverlay` in `OverlayShell`): fullscreen fixed panel with
  fade-in animation, breadcrumb navigation (Home → word ID), and close button.
- **Content** (`WordDetailContent`): word heading (with comment tooltip),
  importance badge, tag list, translations with like buttons, view counter
  (prod-only, formatted as "1.2k"), word-level like button.
- **Cross-references**: translations matching `гл. X` / `параўн. X` render as
  italic clickable links. Hovering after 150ms fetches the target word and shows
  a positioned popup (320px) with full word detail. Self-referencing crossrefs
  show a Spider-Man pointing meme instead. Popup follows mouse; closes 300ms
  after mouse leaves.
- **SEO page** (`/word/[id]`): full `<head>` meta (title, description from
  translations, og:_, twitter:_, DefinedTerm JSON-LD). Hidden words get
  `noindex`.

### Blog

- **Blog list** (`/blog`): paginated cards (`BLOG_PAGE_SIZE = 5`). Each card
  shows published date (Belarusian format), title, hashtags, and a "Замацаванае"
  badge if pinned. Pinned posts get a primary-colored border. Hashtag filter
  chip ("Мовазнаўства") at the top. Pagination synced to URL (`?page=N`).
- **Blog detail** (`/blog/{slug}`): Markdown rendered as styled HTML (headings,
  blockquotes, code blocks, images, lists). Footer has view counter + like
  button. Standalone route includes full SEO meta.
- **Blog likes**: optimistic toggle with rollback, persisted per-device.

### Suggest a word (`/suggest`)

- **Form**: word (required), translation (required), comment (optional, for
  explaining the calque). Submit creates a `pending` suggestion.
- **Suggestion list**: all public suggestions shown as cards with status badges:
  У чаканьні (pending), Ухваленае (approved, green), Адкінутае (rejected, red),
  Ухваленае, але без публікацыі (agreed, yellow).
- **Own suggestions**: identified by `user_token`; only the author (or dev mode)
  sees the delete button.

### Contact form

- **Trigger**: "Напісаць творцу" link in the footer (shown when search is active).
- **Form** (modal): name (required), Telegram (optional), message (required).
  Success shows "Дзякую! Паведамленне адасланае."
- **My messages view**: lists user's own messages with admin replies (if any) in
  a primary-colored box.
- **Unread reply notification**: floating popup "📩 Новы адказ" when a reply
  arrives; clicking it opens the messages view and marks as read.

### AI assistant (chat widget)

- **Desktop-only** FAB (56px circular chat bubble, bottom-right). Preloads the
  component on hover/focus/touchstart. Click opens the chat panel.
- **Chat panel**: fixed position, min(380px) wide, min(560px) tall. Can toggle
  to fullscreen. Slide-up animation.
- **Messages**: user messages right-aligned (primary bubble), assistant messages
  left-aligned (surface bubble, rendered as HTML with markdown support).
- **Input**: textarea, Enter sends, Shift+Enter for newline.
- **History**: last 40 messages persisted in localStorage.
- **Escape key**: collapses fullscreen first, then closes.

### Theme system

Three themes, toggled by a header button:

- **Light** (default) — ☀️ icon
- **Dark** — 🌙 icon
- **National** (red Belarusian theme) — 🏰 icon, desktop-only (hidden on mobile)

Applied via `data-theme` attribute on `<html>`. Stored in localStorage.
Respects `prefers-color-scheme: dark` on first visit; listens for OS changes
until the user manually picks a theme. `<meta name="theme-color">` is updated
for mobile browser chrome.

### PWA

Bottom bar prompt: "Усталяваць аплікацыю — Дадайце да галоўнага экрана для
хуткага доступу" with "Не" / "Усталяваць" buttons. Handles `safe-area-inset`
for notch devices.

### Ban system

Server-side: ban list loaded every 60s; banned `user_token` or IP → API gets
403 JSON, pages get a fullscreen "Доступ забаранёны" overlay with the reason.
No navigation possible while banned.

### Likes & views

- **Likes** (words, translations, blog posts): optimistic toggle, per-device
  `localStorage` persistence, server-confirmed count. Token-based identification
  (`user_token` UUID in cookie + localStorage).
- **Views** (words, blog posts): prod-only, deduplicated per session, optimistic
  bump with server confirmation.

### URL state & navigation

Search, sort, order, tags, blog page, and blog hashtag are all URL-synced.
Overlays (word detail, blog, suggest) use `pushState`; filter changes use
`replaceState`. Browser back/forward restores the correct overlay.
Canonical URLs preserve `page` and `hashtag` params; drop tracking params.

### Easter egg

A hidden "Переключиться на русский" button dodges the cursor on hover (up to 4
times). After it stops, clicking it iteratively removes DOM elements, then shows
a cat GIF with a pulsing red glow. Triggers once (stored in localStorage).

## Tooling

- Package manager is **bun** (never npm). Scripts: `dev`, `build`, `preview`,
  `check` (svelte-check), `lint` (eslint), `format`, `test` (vitest).
- CI (`.github/workflows/ci.yml`) runs `check`, `test`, `format:check` and
  `lint --max-warnings 0` on every push/PR to `main`.
- Husky + lint-staged runs prettier/eslint on staged files.
- Every production change that touches the database must ship a migration in
  `supabase/migrations/`; `supabase-schema.sql` is the "run-on-fresh-DB" copy
  that must be kept in sync. (Directories `migrations/`, `supabase-migrations/`,
  `supabase/.temp/` are empty leftovers — do not use them.)

## Environment variables (see `.env.example`)

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` — public, bundled in the client.
- `PRIVATE_SUPABASE_SERVICE_ROLE_KEY` — server-only. Required for `getServiceClient()`.
- `ASSIST_PROVIDER` (`groq` default | `gemini`), `GROQ_API_KEY`/`GROQ_MODEL`,
  `GEMINI_API_KEY`/`GEMINI_MODEL` — the AI support agent.

## Data model (Supabase)

Run in `supabase-schema.sql`: a single Postgres schema with RLS.

### Tables

- `words(id TEXT PK, importance_id, comment, likes, views, hidden, is_pinned, pinned_at, created_at)`
  — `id` is the headword itself. There is no separate word id, which is why a
  rename trigger must rewrite crossref translations (see below).
- `translations(id, word_id, translation, comment, sort_order, likes, created_at)`
- `tags(id, name)` / `word_tags(word_id, tag_id)` — a word must keep ≥ 1 tag
  (trigger `prevent_last_tag_removal`).
- `importance(id, name, level)` — quality levels, see the contract below.
- `posts(id, slug, title, content, hashtags[], is_pinned, published_at, created_at, updated_at, likes, views)`
  — blog posts; `content` is Markdown.
- `suggestions(id, word, translation, comment, status, user_token, published_at, created_at)`
  — public word suggestions (`pending | approved | rejected | agreed`).
- `messages(id, name, telegram, message, user_token, reply, ip_address, created_at)`
  — contact-form submissions.
- `banned_users(id, user_token, name, telegram, reason, ip_address, message_id, banned_by, created_at)`.
- `referrals(code, clicks, created_at)` — `?ref=` link tracking.

### IMPORTANT CONTRACT: importance ids ↔ levels

`importance.id` is a serial, but the rows are **pinned explicitly** so every
environment agrees:

| id  | name              | level |
| --- | ----------------- | ----- |
| 8   | Сынонімы          | -2    |
| 7   | Трасянка          | -1    |
| 6   | Уважліва          | 0     |
| 1   | Можна лепей       | 1     |
| 2   | Нязграба          | 2     |
| 3   | Недарэка          | 3     |
| 4   | Жах               | 4     |
| 5   | Паўсюдны жах (💀) | 5     |

- The mapping must stay identical in **three** places: `src/lib/constants.ts`
  (`importanceLevels` + comment), the `supabase-schema.sql` seed, and the
  `rotate-pinned-word` cron (which hardcodes `importance_id = 5`).
- **Never** hardcode importance ids anywhere except the cron; the stable key is
  `level` (badges, sorting, the "worst words" logic all use `level`).
- The live production DB matches this table (verified by testing the cron), so
  do not "fix" the schema to a different ordering.

### SQL functions & triggers

- `get_words(search, tag_filter, sort_field, sort_dir, result_offset, result_limit, word_ids, include_hidden)`
  — the workhorse. Filters all search terms (each term must match the word or
  ≥1 translation, lenient via `normalize_text`), ranks by pg_trgm similarity
  (word match weighs ×2 over translation match), sorts by `importance` (by
  `level`), `likes`, `created_at` (zero-padded string) or `word`, aggregates
  translations/tags set-based after pagination, hides `hidden` words unless
  `include_hidden` (gated by the service client).
- `get_word_by_id(word_id)`, `reorder_translations(ids, sort_orders)`,
  `increment_/decrement_word_likes`, `increment_/decrement_translation_likes`,
  `increment_/decrement_post_likes`, `increment_word_views`,
  `increment_post_views`, `increment_referral`.
- `normalize_text(s)` (SQL) and `normalizeText` in `src/lib/highlight.ts` are
  _nearly_ identical: both lowercase, strip stress (U+0301), and apply
  `ё/э→е`, `и→і`, `i→і`, `у→ў`, `г→ґ`. They intentionally diverge on
  apostrophes (SQL strips them; TS normalizes to U+2019 `'`) and Latin extras
  (TS handles `ł→l`, `ŭ→u`; SQL does not). The test suite asserts this
  divergence.
- Trigger `words_crossrefs_after_rename`: when a word is renamed, translations
  whose text is exactly `гл. <old>` / `параўн. <old>` (case-insensitive) are
  rewritten to the new id. This exists _only_ because word ids are used as
  reference targets.

### RLS

- `anon` may always SELECT public content: `importance`, `tags`, `posts`,
  `suggestions`, and `words`/`word_tags`/`translations` **excluding** hidden
  words (`hidden = true` are invisible to anon by RLS).
- Everything else (writes, admin reads, `banned_users` which has **no** anon
  policy) goes through `getServiceClient()` (service-role key, bypasses RLS).
- All writes are server-side only; the public anon client is used for reads.

## Cache & client state model

The homepage HTML is identical for every visitor, so:

- `+page.server.ts` sets `Cache-Control: public, s-maxage=43200 (12h),
stale-while-revalidate` — unless a `?ref=` is present, which forces
  `no-store` so referral clicks are always counted.
- Because the CDN may serve counts up to 12h stale, the client re-syncs like
  counts from `/api/likes` on mount (`userStore.syncLikeCounts`). This is
  unbounded (all word/translation ids) and fine because the dictionary is small.
- `hooks.server.ts` adds a default `Cache-Control: public, s-maxage=900` to any
  non-JSON GET page response that doesn't already set one (blog pages, etc.).
  Never set cache headers on the `/api/*` JSON routes (they must stay dynamic).
- Per-user "liked" state is **per-device** `localStorage` maps
  (`liked_words`, `liked_translations`, `liked_posts`) plus a
  `user_token` (UUID) used to identify the visitor across requests (bans,
  suggestions "is_mine"). Likes are optimistic with rollback; the count shown is
  the server-confirmed number.
- Views are a **prod-only** metric: `/api/views` returns `views: null` in dev
  and `userStore.incrementView` skips entirely unless `import.meta.env.PROD`;
  each id is counted once per page-load session (`#viewed` set).

## Search, transliteration & highlighting

- Latin input is converted to Cyrillic before searching (`latToCyr` in
  `src/lib/lacinka.ts`) in both the SQL RPC and the client, so users can type
  either script. The transliteration is a lossy, best-effort mapping
  (ё/э ambiguity, soft consonants, digraphs ch/cz/sz/rz, iotation) and is kept
  deterministic — changing it breaks round-trips and stored search results.
- Word search in practice additionally supports the Latin display mode used to
  show the dictionary in Latin script (`cyrToLat`).
- Client sorting by word uses ICU collation `localeCompare(a, b, 'be')` — plain
  codepoint order is wrong for Belarusian (і sorts between з and й).
- `highlightText` escapes HTML and marks matched substrings; the query is
  inserted between each char so "абя" matches "аб'ява"/"абʼява", with index
  remapping when normalization changes string lengths.

## Pinned word & the cron

- `vercel.json` schedules `GET /api/cron/rotate-pinned-word` weekly
  (Sunday 00:00 UTC). It unpins every word, then pins one random word with
  `importance_id = 5` (the worst level, 💀 / Паўсюдны жах). The "word of the
  week" section on the homepage is derived client-side from `is_pinned`.
- Pinned words are ordinary words (never hidden), returned by the normal
  `get_words` call with `include_hidden=false`.
- **Security note**: the cron checks only spoofable headers (`vercel-cron`,
  `x-vercel-cron-*`). This is a known, documented weakness (see the comment in
  the route); hardening would require a `CRON_SECRET` env var. Do not "fix" it
  silently — the user is aware.

## Blog

- Feed (`fetchBlogPosts`, shared by SSR `/blog` and `/api/blog`): pinned first,
  then by `published_at` desc; paginated in `BLOG_PAGE_SIZE` (5).
- **Scheduled posts**: in `PROD`, posts with `published_at > now` are hidden
  from every public surface (feed, blog detail SSR, `/api/blog/[slug]`,
  sitemap). In dev they remain visible so `BlogAdmin` can edit/delete them.
- All admin/blog-modification and admin REST endpoints (`/api/blog/create`,
  `[slug]/edit`, `[slug]/like` is public, upload-image, `/api/banned`,
  `/api/suggestions/[id]/resolve`, messages reply, etc.) call `requireDev()`,
  which returns 404 in production. There is intentionally no admin UI in prod.
- Posts render Markdown (`marked`). Blog image uploads go to the public storage
  bucket `blog-images` via the service client (dev-only).
- The client overlay fetches `/api/blog/[slug]` and memoizes per slug in an
  in-memory `Map` (`fetch-blog.ts`).

## Suggestions, contact & bans

- Anyone can submit a suggestion (`/api/suggestions`); statuses flow
  pending → approved/rejected/agreed by an admin (dev-only endpoint). Public
  listing shows all; `is_mine` marks the viewer's own via `user_token`.
- The contact form writes to `messages`, optionally carries a `user_token`
  and `ip_address`, and supports admin replies (dev-only). Banned people
  are matched by `user_token`, `name`, `telegram` and/or `ip_address`.
- `hooks.server.ts` loads the ban list every 60s into memory and blocks banned
  visitors: API calls get 403 JSON, pages get `locals.banned`/`banReason` to
  render a blocked screen. Ban refresh is lazy (only on traffic).

## AI support agent (`/api/assist`)

- OpenAI-compatible function calling against `groq` (default) or `gemini`.
  Tools are **read-only**: `search_words`, `get_word`, blog lookup; answers use
  the DB, never invented data. `SYSTEM_PROMPT` and `HIDDEN_CONTEXT` live in
  `src/lib/server/assist-context.ts` (server-only, never shipped to the client).
- Hidden (draft) words are never exposed to the model (`INCLUDE_HIDDEN_WORDS=false`).
- Robustness: `MAX_TOOL_ROUNDS = 5`, per-provider retries (3) with capped
  backoff on 429/5xx, HTTP 429 surfaced as a retryable `AssistRateLimitError`,
  blog content truncated to 600 chars.

## SEO (important — app is on Vercel)

- SSR for homepage, blog list/detail, word detail. `sitemap.xml` lists homepage,
  `/blog`, all non-hidden words and all published (not scheduled) posts; served
  with `max-age=604800`. Canonical params, breadcrumbs JSON-LD and consistent
  meta live in the layout/components.
- Keeping `hidden=true` words and future posts out of the sitemap, canonical
  URLs, and the public HTML is an explicit SEO requirement.

## Testing

- Vitest (`bun run test`). ~8 files / 159 tests covering `word-search`,
  `lacinka`, `highlight`/normalize, `assist-core`, `assist`, `userStore`,
  markdown helpers. When behaviour of search/transliteration changes, extend
  these suites — they pin the lossy normalization decisions.
