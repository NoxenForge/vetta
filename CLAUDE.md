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
- **Styling:** `class-variance-authority` (component variants), `clsx` + `tailwind-merge` (class merging via `cn()`), `tw-animate-css`
- **Charts:** recharts (LineChart, BarChart, RadarChart) — time-series charts (star growth, fork trend), commit pulse bar chart, and radar/metrics dashboard
- **Markdown 渲染:** `react-markdown` + `remark-gfm` + `remark-gemoji` + `rehype-raw` + `rehype-highlight`，使用 `github-markdown-css` 实现 GitHub 官方视觉样式
- **GFM Alert 支持:** 自定义 `blockquote` 组件将 `> [!NOTE]` / `[!WARNING]` 等渲染为彩色提示框
- **Icons:** lucide-react
- **Theme:** `next-themes` — dark/light/system mode with CSS custom properties in `globals.css`
- **Font:** Geist (next/font/google)
- **Language:** TypeScript 5 (strict mode)
- **i18n:** next-intl v4 — `[locale]` prefix routing (en / zh / tw), `as-needed` mode (default locale has no prefix)
- **Auth/DB:** Supabase (`@supabase/ssr` + `@supabase/supabase-js`) — session-based auth with cookie management in middleware
- **Monitoring:** Vercel Analytics + Speed Insights
- **Markdown:** react-markdown + remark-gfm (README rendering)
- **Output:** standalone mode

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                       # Root layout: Geist font, ThemeProvider, Analytics, SpeedInsights
│   ├── not-found.tsx                    # Global 404
│   ├── icon.tsx                         # Favicon
│   ├── robots.ts                        # robots.txt
│   ├── sitemap.ts                       # Dynamic sitemap
│   ├── api/jobs/
│   │   ├── trending/route.ts        # GET → triggers TrendingJob
│   │   └── enrich-details/route.ts  # GET → triggers EnrichDetailsJob
│   └── [locale]/
│       ├── layout.tsx                   # Locale layout: NextIntlClientProvider + Header + Footer
│       ├── page.tsx                     # Home page — GitHub Trending (Server Component)
│       ├── loading.tsx                  # Route-level loading skeleton
│       ├── error.tsx                    # Route-level error boundary
│       ├── not-found.tsx                # Locale-level 404
│       ├── globals.css                  # Tailwind + shadcn CSS variables + theme tokens
│       ├── privacy/page.tsx             # Privacy policy page
│       ├── terms/page.tsx               # Terms of service page
│       └── repo/[owner]/[repo]/
│           ├── page.tsx                 # Repo detail: 7 Suspense sections (see Architecture Notes)
│           ├── loading.tsx              # RepoDetailSkeleton
│           └── error.tsx                # Error boundary
├── components/
│   ├── ui/                              # shadcn/ui primitives (Button, Badge, Skeleton, DropdownMenu)
│   ├── layout/                          # App shell components
│   │   ├── header.tsx                   # Sticky header with nav, theme toggle, language switcher
│   │   ├── footer.tsx                   # Site footer
│   │   ├── theme-toggle.tsx             # Dark/light/system mode toggle (DropdownMenu)
│   │   └── language-switcher.tsx        # Locale switcher (en/zh/tw)
│   ├── trending/                        # Feature components for the trending page
│   │   ├── trending-header.tsx          # Page heading + time range selector
│   │   ├── language-filter.tsx          # Programming language filter bar
│   │   ├── repository-grid.tsx          # Responsive card grid
│   │   ├── repository-card.tsx          # Individual repo card (clickable → detail page)
│   │   ├── repository-card-skeleton.tsx # Loading placeholder
│   │   └── time-range-selector.tsx      # daily/weekly/monthly toggle
│   └── repo/                            # Repo detail page components
│       ├── repo-header.tsx              # Repo metadata (avatar, stars, forks, topics, links)
│       ├── stats-cards.tsx              # 6 KPI cards (stars/forks/issues/contributors/releases/growth) with sparkline
│       ├── star-growth-chart.tsx        # recharts LineChart — star count over time
│       ├── fork-trend-chart.tsx         # recharts LineChart — fork count over time (≥2 snapshots)
│       ├── metrics-dashboard.tsx        # recharts RadarChart + BarChart — 6-dimension radar + 52-week commit pulse
│       ├── readme-viewer.tsx            # Markdown README renderer
│       ├── trend-chart.tsx              # Snapshot history table (daily/weekly/monthly/all tabs)
│       └── repo-detail-skeleton.tsx     # Loading skeleton
├── lib/
│   ├── utils.ts                         # cn() helper (clsx + tailwind-merge)
│   └── repository.service.ts            # Data fetching: getTrendingRepos(), getAvailableLanguages(), getRepoDetail()
├── types/
│   └── ui.ts                            # TrendingRepo, TrendingFilters, TimeRange, RepoDetail, TrendSnapshot
├── i18n/
│   ├── request.ts                       # next-intl config (server-side)
│   └── routing.ts                       # Locale routing + Link/redirect/usePathname helpers
├── locales/
│   ├── en/common.json
│   ├── zh/common.json
│   └── tw/common.json
├── jobs/                                # 4-layer data pipeline (see Jobs Pipeline section)
│   ├── index.ts                         # Module entry — registers all jobs on import
│   ├── scheduler/                       # registry.ts (global singleton JobRegistry) + types.ts
│   ├── discovery/                       # github-trending.ts + types.ts
│   ├── fetcher/                         # repository.ts, readme.ts, commit-participation.ts, contributor-count.ts, release-summary.ts + types.ts
│   ├── storage/                         # supabase.ts, json-file.ts, memory.ts + types.ts
│   └── definitions/
│       ├── trending.job.ts             # TrendingJob: Discovery + Repo Fetch + Snapshots (no README)
│       └── enrich-details.job.ts       # EnrichDetailsJob: 全量刷新所有仓库元数据+README
├── utils/
│   ├── github-api.ts                    # GitHub API shared client (auth, retry, 429 handling)
│   └── supabase/
│       ├── client.ts                    # Browser client (createBrowserClient)
│       ├── server.ts                    # Server Component client (createServerClient + cookies)
│       └── middleware.ts                # Middleware client (createServerClient + NextRequest)
└── middleware.ts                        # Combined: Supabase session refresh + next-intl routing
components.json                          # shadcn/ui configuration
supabase-schema.sql                      # Database table definitions + RLS policies + migrations
vercel.json                              # Vercel Cron Job config (two cron jobs at UTC midnight + 1am)
```

## Architecture Notes

### Page Data Flow

The home page (`src/app/[locale]/page.tsx`) follows the RSC (React Server Component) pattern:

1. Page is an **async Server Component** — fetches data directly, no `useEffect` or client-side fetching
2. `searchParams` drives `since` (daily/weekly/monthly) and `language` filters from URL query params
3. `repository.service.ts` queries Supabase via the **anon key** (public read, RLS-enforced)
4. Two parallel fetches: `getTrendingRepos()` + `getAvailableLanguages()` (no waterfall)
5. Three `<Suspense>` boundaries provide progressive loading: header → language filter → grid

### Repo Detail Page

`src/app/[locale]/repo/[owner]/[repo]/page.tsx` — individual repository view with 7 Suspense sections:

1. **RepoHeader** — owner/avatar/stars/forks/issues, topics, external links
2. **StatsCards** — 6 KPI cards (stars, forks, issues, total star growth, contributors, releases) with sparkline mini-charts
3. **StarGrowthChart** — recharts LineChart of stargazers_count across all snapshots (sorted by time)
4. **ForkTrendChart** — recharts LineChart of forks_count across all snapshots (only rendered when ≥2 snapshots exist)
5. **MetricsDashboard** — recharts RadarChart (6 dimensions: Activity, Community, Issues, Releases, Code, Maintenance) + BarChart (52-week commit pulse)
6. **ReadmeViewer** — rendered markdown from `readme_content`
7. **TrendChart** — tabbed table (daily/weekly/monthly/all) of snapshot history

The page also:
- Returns 404 via `notFound()` if repo doesn't exist
- Uses `generateMetadata()` to dynamically set OG title/description/avatar for social sharing
- Each Suspense section has a tailored skeleton fallback (pulsing bars for charts, blank card for README)

### Sorting Strategy

Repositories are sorted **client-side by `stargazers_count` descending** because Supabase doesn't support ordering by joined table fields. The `rank` field in `trending_snapshots` is only for historical reference, not display ordering. This prevents duplicate rank 1 entries when a repo drops off the trending list between fetches.

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
- Feature components under `components/` are standard React components (no shadcn wrapping needed)

### Layout & Shell

- **Root layout** (`src/app/layout.tsx`): Geist font, `<ThemeProvider>`, Vercel Analytics + Speed Insights
- **Locale layout** (`src/app/[locale]/layout.tsx`): `<NextIntlClientProvider>` wraps `<Header />` + `<main>{children}</main>` + `<Footer />`
- Header (Client Component): sticky, responsive with mobile hamburger menu, nav links (Home, Privacy, Terms), theme toggle, language switcher

### Middleware (combined auth + i18n)

`src/middleware.ts` runs two concerns in a single middleware:
1. Creates a Supabase server client and calls `supabase.auth.getUser()` to refresh expired sessions — this keeps cookies valid for Server Components.
2. Delegates to `next-intl` middleware for locale routing.
3. Merges Supabase `Set-Cookie` headers into the intl response so session cookies survive locale redirects.

The matcher excludes static assets, API routes, and common file patterns.

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

Note: The `secret` query parameter used by Vercel Cron Job API routes is hardcoded as `"vetta_cron_secret_2026"` in each route file — it does not use an environment variable.

### Vercel Cron Jobs

Configured in `vercel.json` — two independent cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/jobs/trending?secret=vetta_cron_secret_2026",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/jobs/enrich-details?secret=vetta_cron_secret_2026",
      "schedule": "0 * * * *"
    }
  ]
}
```

| Job | Schedule (UTC) | Purpose |
|-----|---------------|---------|
| `trending` | `0 0 * * *` (midnight) | Discover trending repos + save metadata + snapshots |
| `enrich-details` | `0 * * * *` (hourly) | Full refresh: iterate ALL repos, fetch metadata + README |

The separation ensures repos from any source (not just trending) get their data filled, and timing between the two pipelines stays independent. Each API route checks the `secret` query param before executing.

### Charts (recharts)

The repo detail page uses **recharts** for three visualizations:

- **StarGrowthChart** (`LineChart`): `stargazers_count` across all snapshots, sorted by `fetched_at`. Always displayed.
- **ForkTrendChart** (`LineChart`): `forks_count` across all snapshots. Only rendered when ≥2 snapshots exist.
- **MetricsDashboard** (`RadarChart` + `BarChart`): 6-dimension health radar (Activity, Community, Issues, Releases, Code, Maintenance) computed from commit activity, contributor count, release count, star growth, issue count, and last push recency. The commit pulse BarChart visualizes the 52-week `commit_activity` array. Only rendered when at least one metrics field has data.

All charts share the same pattern:
- `ResponsiveContainer` for responsive sizing
- Custom `formatAxis()` helper for K/M axis labels
- `CartesianGrid` + `Tooltip` for readability
- Data is sorted chronologically via `useMemo` before passing to recharts

The `TrendChart` (snapshot history table) is a separate component — it shows raw data in a tabbed table, not a chart.

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

### Triggers

```
GET /api/jobs/trending?secret=...         → executes TrendingJob (discovery + metadata + snapshots)
GET /api/jobs/enrich-details?secret=...   → executes EnrichDetailsJob (全量刷新元数据+README)
```

Both API routes follow the same pattern: `force-dynamic`, `nodejs` runtime, secret-based auth, 10-minute timeout. `src/jobs/index.ts` registers both jobs with the global `JobRegistry` singleton on module load.

### TrendingJob Flow (`definitions/trending.job.ts`)

1. Iterates over all three `since` values (daily, weekly, monthly)
2. **Discovery**: scrapes GitHub Trending HTML via `cheerio`
3. **Fetcher** (with concurrency limit of 5): fetches repo metadata from GitHub API
4. **Snapshot generation**: creates `TrendingSnapshot` records combining candidate rank with fetched repo stats
5. **Storage**: writes unique repos + all snapshots to Supabase via `service_role` key

**Note:** TrendingJob no longer fetches READMEs — that's handled by enrich-details.

### EnrichDetailsJob Flow (`definitions/enrich-details.job.ts`)

1. Queries `repositories` table for **all** repos (id, owner, repo)
2. For each repo, fetches **5 data sources in parallel** (concurrency limit of 5):
   - Repository metadata (`GET /repos/{owner}/{repo}`)
   - README content (`GET /repos/{owner}/{repo}/readme`)
   - Commit participation — 52-week activity (`GET /repos/{owner}/{repo}/stats/participation`; handles 202 "calculating" gracefully)
   - Release summary — latest 5 releases (`GET /repos/{owner}/{repo}/releases?per_page=5`)
   - Contributor count — via `Link` header pagination trick (`GET /repos/{owner}/{repo}/contributors?per_page=1&anon=true`)
3. Collects successful results, logs failures individually (non-fatal)
4. Saves metadata via `repoStorage.saveBatch()`, README via `readmeStorage.saveBatch()`, and metrics (`commit_activity`, `contributor_count`, `release_count`, `latest_release_at`) via individual `UPDATE` on the `repositories` table
5. Runs hourly — ensures all repo data stays fresh regardless of source

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
| `repositories` | `id` (BIGINT) | Repo metadata + engineering metrics (stars, forks, issues, commit_activity, contributor_count, release_count, etc.) |
| `trending_snapshots` | `(repo_id, since)` | Trending snapshots with repo metrics by time range |
| `readmes` | `repo_id` (BIGINT) | Raw README content |

- All tables have `created_at` and `updated_at` TIMESTAMPTZ columns
- `trending_snapshots.repo_id` and `readmes.repo_id` foreign-key to `repositories(id)`, `ON DELETE CASCADE`
- `repositories` table includes engineering metrics columns: `commit_activity` (JSONB, 52-week array), `contributor_count` (INTEGER), `release_count` (INTEGER), `latest_release_at` (TIMESTAMPTZ)
- RLS enabled: all tables allow `SELECT` for the `anon` role (read-only)
- Writes use `service_role` key to bypass RLS
- Indexes: `full_name`, `language`, `stargazers_count`, `since`, `fetched_at`
- Schema includes migration statements (`ADD COLUMN IF NOT EXISTS`, `ALTER COLUMN`) for existing tables

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

### Engineering Metrics Fetchers

Three additional fetchers power the Metrics Dashboard, each calling a different GitHub API endpoint:

| Fetcher | Endpoint | Type | Notes |
|---------|----------|------|-------|
| `commitParticipationFetcher` | `GET /repos/{owner}/{repo}/stats/participation` | `CommitParticipation` | Returns 52-week `all` array; handles 202 (background calculation) gracefully |
| `releaseSummaryFetcher` | `GET /repos/{owner}/{repo}/releases?per_page=5` | `ReleaseSummary` | Returns `release_count` and `latest_release_at` |
| `contributorCountFetcher` | `GET /repos/{owner}/{repo}/contributors?per_page=1&anon=true` | `ContributorCount` | Parses `Link` header `rel="last"` to get total count without fetching all pages |

All three follow the same pattern: graceful error handling returns zero/empty defaults, and `repo_id` is patched by the job layer after fetching.

## i18n

- **Supported locales:** `en` (default), `zh`, `tw`
- **Locale prefix mode:** `as-needed` — default locale (`en`) gets no URL prefix; `zh` and `tw` get `/zh/` and `/tw/` prefixes
- **Helper functions** exported from `src/i18n/routing.ts`: `Link`, `redirect`, `usePathname`, `useRouter` (navigation-aware), plus `isDefaultLocale()` and `localePrefix()`
- **Config files:** `src/i18n/request.ts`, `src/i18n/routing.ts`
- Translation keys follow a namespace pattern (e.g., `"Header.title"`, `"Trending.title"`, `"Repo.trendHistory"`)

## Git Workflow

- **每个新功能必须单独新建分支**，不允许直接在 `main` 上开发。分支命名：`feat/<feature-name>`、`fix/<bug-name>`、`chore/<task-name>`。
- Commit format: `<type>: <description>` — types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

## Notes

- This project is **Vetta** — a Next.js app displaying trending GitHub repositories with daily/weekly/monthly views, language filtering, individual repo detail pages with README rendering and time-series charts, and Supabase-backed data.
- All user-facing strings must go through `next-intl` translations, not hardcoded.
- Keep new pages under `src/app/[locale]/`.
- Row-Level Security (RLS) should be enforced in Supabase for any data access — the anon key is public.
- Comments in this codebase are written in Chinese.
