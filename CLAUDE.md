# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server on port 4000 (Turbopack)
npm run build    # Production build (standalone output)
npm run start    # Start production server
npm run lint     # ESLint (next lint)
```

## Stack

- **Framework:** Next.js 15 (App Router) with Turbopack
- **UI:** React 19, TailwindCSS v4, **shadcn/ui** (base-nova style, neutral base), **Base UI** (headless primitives)
- **Styling:** `class-variance-authority` (component variants), `clsx` + `tailwind-merge` (class merging via `cn()`)
- **Icons:** lucide-react
- **Theme:** `next-themes` — dark/light mode with CSS custom properties in `globals.css`
- **Language:** TypeScript 5 (strict mode)
- **i18n:** next-intl v4 — `[locale]` prefix routing (en / zh / tw), `as-needed` mode (default locale has no prefix)
- **Auth/DB:** Supabase (`@supabase/ssr` + `@supabase/supabase-js`) — session-based auth with cookie management in middleware
- **Output:** standalone mode

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (redirects to default locale)
│   ├── not-found.tsx                 # Global 404
│   ├── api/jobs/trending/route.ts    # GET /api/jobs/trending → triggers full pipeline
│   └── [locale]/
│       ├── layout.tsx                # Locale layout (fonts, i18n provider)
│       ├── page.tsx                  # Home page — GitHub Trending (Server Component)
│       ├── loading.tsx               # Route-level loading skeleton
│       ├── error.tsx                 # Route-level error boundary
│       └── globals.css               # Tailwind + shadcn CSS variables + theme tokens
├── components/
│   ├── ui/                           # shadcn/ui primitives (Button, Badge, Skeleton)
│   └── trending/                     # Feature components for the trending page
│       ├── trending-header.tsx       # Page heading + time range selector
│       ├── language-filter.tsx       # Programming language filter bar
│       ├── repository-grid.tsx       # Responsive card grid
│       ├── repository-card.tsx       # Individual repo card
│       ├── repository-card-skeleton.tsx  # Loading placeholder
│       └── time-range-selector.tsx   # daily/weekly/monthly toggle
├── lib/
│   ├── utils.ts                      # cn() helper (clsx + tailwind-merge)
│   └── repository.service.ts         # Data fetching: getTrendingRepos(), getAvailableLanguages()
├── types/
│   └── ui.ts                         # TrendingRepo, TrendingFilters, TimeRange
├── i18n/
│   ├── request.ts                    # next-intl config (server-side)
│   └── routing.ts                    # Locale routing + Link/redirect/usePathname helpers
├── locales/
│   ├── en/common.json
│   ├── zh/common.json
│   └── tw/common.json
├── jobs/                             # 4-layer data pipeline (see Jobs Pipeline section)
│   ├── index.ts                      # Module entry — registers all jobs on import
│   ├── scheduler/                    # registry.ts (global singleton JobRegistry) + types.ts
│   ├── discovery/                    # github-trending.ts + types.ts
│   ├── fetcher/                      # repository.ts, readme.ts + types.ts
│   ├── storage/                      # supabase.ts, json-file.ts, memory.ts + types.ts
│   └── definitions/                  # trending.job.ts (composes Discovery + Fetcher + Storage)
├── utils/
│   ├── github-api.ts                 # GitHub API shared client (auth, retry, 429 handling)
│   └── supabase/
│       ├── client.ts                 # Browser client (createBrowserClient)
│       ├── server.ts                 # Server Component client (createServerClient + cookies)
│       └── middleware.ts             # Middleware client (createServerClient + NextRequest)
└── middleware.ts                     # Combined: Supabase session refresh + next-intl routing
components.json                       # shadcn/ui configuration
supabase-schema.sql                   # Database table definitions + RLS policies
```

## Architecture Notes

### Page Data Flow

The home page (`src/app/[locale]/page.tsx`) follows the RSC (React Server Component) pattern:

1. Page is an **async Server Component** — fetches data directly, no `useEffect` or client-side fetching
2. `searchParams` drives `since` (daily/weekly/monthly) and `language` filters from URL query params
3. `repository.service.ts` queries Supabase via the **anon key** (public read, RLS-enforced)
4. Two parallel fetches: `getTrendingRepos()` + `getAvailableLanguages()` (no waterfall)
5. Three `<Suspense>` boundaries provide progressive loading: header → language filter → grid

### Theme System

- Powered by `next-themes` — supports light/dark/system modes
- CSS custom properties defined in `globals.css` for both `:root` (light) and `.dark` (dark)
- All colors use the `oklch()` color space
- shadcn/ui components reference theme tokens (`--primary`, `--background`, `--border`, etc.)
- The `cn()` utility in `src/lib/utils.ts` merges Tailwind classes without conflicts

### UI Component Architecture

- **shadcn/ui** generates components into `src/components/ui/` via `npx shadcn add`
- Components use **Base UI** (`@base-ui/react`) as the headless foundation (e.g., `<ButtonPrimitive>`)
- **CVA** (`class-variance-authority`) defines variant/size APIs: `buttonVariants({ variant: "outline", size: "lg" })`
- Custom composable components use `useRender` from Base UI for polymorphic rendering
- Feature components under `components/trending/` are standard React components (no shadcn wrapping needed)

### Middleware (combined auth + i18n)

`src/middleware.ts` runs two concerns in a single middleware:
1. Creates a Supabase server client and calls `supabase.auth.getUser()` to refresh expired sessions — this keeps cookies valid for Server Components.
2. Delegates to `next-intl` middleware for locale routing.
3. Merges Supabase `Set-Cookie` headers into the intl response so session cookies survive locale redirects.

The matcher excludes static assets and API routes.

### Supabase Client Pattern

Three factory functions for different contexts, all using `@supabase/ssr`:

| File | Context | Key difference |
|------|---------|---------------|
| `client.ts` | Browser (Client Components) | `createBrowserClient` — reads cookies from the browser |
| `server.ts` | Server Components / Route Handlers | `createServerClient` — receives `cookies()` store; `setAll` silently ignores errors (expected when called from RSC) |
| `middleware.ts` | Middleware | `createServerClient` — reads from `request.cookies`, writes to both `request.cookies` and response |

All clients use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the anon key, safe for client-side exposure).

### Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= # Supabase anon/publishable key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service_role key (server-side writes, bypasses RLS)
NEXT_PUBLIC_SITE_URL=               # Site URL for metadata (default: http://localhost:4000)
GITHUB_TOKEN=                       # GitHub personal access token (optional, raises rate limit 60→5000 req/h)
```

## Jobs Pipeline (4-Layer Architecture)

GitHub data fetching uses a decoupled 4-layer architecture in `src/jobs/`:

```
Scheduler     →  When to fetch?
    ↓
Discovery     →  Which repos are worth fetching?
    ↓ Candidate[] { owner, repo }
Fetcher       →  Fetch data from GitHub API
    ↓ structured data
Storage       →  Write to Supabase / JSON file / memory
```

### Layer Interfaces

| Layer | File | Core Interface |
|-------|------|---------------|
| Scheduler | `scheduler/types.ts` | `Job { name, run(ctx) }` |
| Discovery | `discovery/types.ts` | `Discovery { name, discover(ctx) → Candidate[] }` |
| Fetcher | `fetcher/types.ts` | `Fetcher<T> { name, fetch(owner, repo, ctx) → T }` |
| Storage | `storage/types.ts` | `Storage<T> { name, save(data), saveBatch(data[]) }` |

### Trigger

```
GET /api/jobs/trending    → executes TrendingJob (full pipeline)
```

The API route is at `src/app/api/jobs/trending/route.ts`. `src/jobs/index.ts` registers the trending job with the global `JobRegistry` singleton on module load; the route triggers it via `registry.run("trending", ctx)`.

### Data Storage

- **Supabase**: Primary production storage, three tables — `repositories`, `trending_snapshots`, `readmes` (schema in `supabase-schema.sql`). Writes use `service_role` key to bypass RLS.
  - `repoStorage` / `snapStorage` / `readmeStorage` defined in `storage/supabase.ts`
- **JSON file**: Alternative local storage (`storage/json-file.ts`), writes to `data/` directory
  - Supports custom dedup key (defaults to `full_name`, overridable via `getKey`)
- **Memory storage**: For testing (`storage/memory.ts`), `createMemoryStorage()`
- `data/` directory is excluded in `.gitignore`

### GitHub API Client (`src/utils/github-api.ts`)

Shared module used by all Fetchers:

- `githubFetch(path, options?)` — wraps auth (`GITHUB_TOKEN` Bearer), User-Agent, 429 auto-retry (up to 3 times, respects `Retry-After` header)
- All GitHub API calls (repo metadata, README) go through this function

### Database Schema (`supabase-schema.sql`)

Three tables, keyed by GitHub repository **id** (immutable integer):

| Table | Primary Key | Purpose |
|-------|------------|---------|
| `repositories` | `id` (BIGINT) | Repo metadata (full_name, owner, stars, topics, etc.) |
| `trending_snapshots` | `(repo_id, since)` | Trending snapshots tracking repo rank and metrics on daily/weekly/monthly lists |
| `readmes` | `repo_id` (BIGINT) | Raw README content |

- `trending_snapshots.repo_id` and `readmes.repo_id` foreign-key to `repositories(id)`, `ON DELETE CASCADE`
- RLS enabled: all tables allow `SELECT` for the `anon` role (read-only)
- Writes use `service_role` key to bypass RLS
- Indexes: `full_name`, `language`, `stargazers_count`, `since`, `fetched_at`

### Adding a New Data Source

Implement the corresponding interface to extend. Use the current trending pipeline as a template:

```
discovery/<new-discovery>.ts        → implements Discovery
fetcher/<new-fetcher>.ts            → implements Fetcher<T>
storage/<new-storage>.ts            → implements Storage<T>
definitions/<new-job>.job.ts        → implements Job (composes Discovery + Fetcher + Storage)
app/api/jobs/<new-job>/route.ts     → corresponding API endpoint
```

### Dependencies

- `cheerio` — HTML parsing (GitHub Trending page scraping)
- `@supabase/supabase-js` — Supabase server-side direct client (used by storage/supabase.ts, bypasses `@supabase/ssr`)
- Optional `GITHUB_TOKEN` env var — raises API rate limit

## i18n

- **Supported locales:** `en` (default), `zh`, `tw`
- **Locale prefix mode:** `as-needed` — default locale (`en`) gets no URL prefix; `zh` and `tw` get `/zh/` and `/tw/` prefixes
- **Helper functions** exported from `src/i18n/routing.ts`: `Link`, `redirect`, `usePathname`, `useRouter` (navigation-aware), plus `isDefaultLocale()` and `localePrefix()`
- **Config files:** `src/i18n/request.ts`, `src/i18n/routing.ts`

## Notes

- This project is **GitHub Trending Intelligence** — a Next.js app displaying trending GitHub repositories with daily/weekly/monthly views, language filtering, and Supabase-backed data.
- All user-facing strings must go through `next-intl` translations, not hardcoded.
- Keep new pages under `src/app/[locale]/`.
- Row-Level Security (RLS) should be enforced in Supabase for any data access — the anon key is public.
- Comments in this codebase are written in Chinese.
