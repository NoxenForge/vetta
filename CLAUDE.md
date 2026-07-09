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
- **UI:** React 19, TailwindCSS v4
- **Language:** TypeScript 5 (strict mode)
- **i18n:** next-intl v4 — `[locale]` prefix routing (en / zh / tw), `as-needed` mode (default locale has no prefix)
- **Auth/DB:** Supabase (`@supabase/ssr` + `@supabase/supabase-js`) — session-based auth with cookie management in middleware
- **Output:** standalone mode

## Project Structure

```
src/
├── app/
│   ├── layout.tsx            # Root layout (redirects to default locale)
│   ├── not-found.tsx         # Global 404
│   ├── api/jobs/trending/    # GET /api/jobs/trending → 触发完整管线
│   └── [locale]/
│       ├── layout.tsx        # Locale layout (fonts, i18n provider)
│       ├── page.tsx          # Home page
│       └── globals.css       # Tailwind + custom styles
├── i18n/
│   ├── request.ts            # next-intl config (server-side)
│   └── routing.ts            # Locale routing + Link/redirect/usePathname helpers
├── locales/
│   ├── en/common.json
│   ├── zh/common.json
│   └── tw/common.json
├── utils/
│   ├── github-api.ts         # GitHub API 共享客户端（auth、重试、429 处理）
│   └── supabase/
│       ├── client.ts         # Browser client (createBrowserClient)
│       ├── server.ts         # Server Component client (createServerClient + cookies)
│       └── middleware.ts     # Middleware client (createServerClient + NextRequest)
└── middleware.ts             # Combined: Supabase session refresh + next-intl routing
supabase-schema.sql           # 数据库表定义 + RLS 策略
```

## Architecture Notes

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
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service_role key（server-side 写入，绕过 RLS）
NEXT_PUBLIC_SITE_URL=               # Site URL for metadata (default: http://localhost:4000)
GITHUB_TOKEN=                       # GitHub personal access token（可选，提升速率限制 60→5000 req/h）
```

## Jobs Pipeline (4-Layer Architecture)

GitHub 数据抓取采用解耦的 4 层架构，位于 `src/jobs/`：

```
Scheduler (调度)     →  什么时候抓？
    ↓
Discovery (发现)     →  哪些仓库值得抓？
    ↓ Candidate[] { owner, repo }
Fetcher (抓取)       →  向 GitHub API 获取数据
    ↓ 结构化数据
Storage (存储)       →  写入 Supabase / JSON 文件 / 内存
```

### 各层接口

| 层 | 文件 | 核心接口 |
|----|------|---------|
| Scheduler | `scheduler/types.ts` | `Job { name, run(ctx) }` |
| Discovery | `discovery/types.ts` | `Discovery { name, discover(ctx) → Candidate[] }` |
| Fetcher | `fetcher/types.ts` | `Fetcher<T> { name, fetch(owner, repo, ctx) → T }` |
| Storage | `storage/types.ts` | `Storage<T> { name, save(data), saveBatch(data[]) }` |

### 触发方式

```
GET /api/jobs/trending    → 执行 TrendingJob（完整管线）
```

API 路由在 `src/app/api/jobs/trending/route.ts`，通过 `registry.run("trending", ctx)` 触发。

### 数据存储

- **Supabase**: 主要生产存储，对应三张表 —— `repositories`、`trending_snapshots`、`readmes`（schema 见 `supabase-schema.sql`）。写入使用 `service_role` key 绕过 RLS。
  - `repoStorage` / `snapStorage` / `readmeStorage` 定义在 `storage/supabase.ts`
- **JSON 文件**: 备选本地存储（`storage/json-file.ts`），数据写入 `data/` 目录
  - 支持自定义去重 key（默认按 `full_name`，可传 `getKey` 覆盖）
- **内存存储**: 测试用（`storage/memory.ts`），`createMemoryStorage()`
- `data/` 目录已在 `.gitignore` 中排除

### GitHub API 客户端 (`src/utils/github-api.ts`)

共享模块，所有 Fetcher 通过它发请求：

- `githubFetch(path, options?)` — 封装 auth（`GITHUB_TOKEN` Bearer）、User-Agent、429 自动重试（最多 3 次，尊重 `Retry-After` 头）
- 所有 GitHub API 调用（仓库元数据、README）都走此函数，避免重复代码

### 数据库 Schema（`supabase-schema.sql`）

三张表，以 GitHub 仓库 **id**（不可变整数）为主键：

| 表 | 主键 | 用途 |
|----|------|------|
| `repositories` | `id` (BIGINT) | 仓库元数据（full_name, owner, stars, topics 等） |
| `trending_snapshots` | `(repo_id, since)` | Trending 快照，记录仓库在 daily/weekly/monthly 榜单上的排名和指标 |
| `readmes` | `repo_id` (BIGINT) | README 原始内容 |

- `trending_snapshots.repo_id` 和 `readmes.repo_id` 外键引用 `repositories(id)`，`ON DELETE CASCADE`
- RLS 启用：所有表对 `anon` 角色开放 `SELECT`（只读）
- 写入通过 `service_role` key 绕过 RLS
- 索引：`full_name`、`language`、`stargazers_count`、`since`、`fetched_at`

### 新增数据源

只需实现对应接口即可扩展。以当前 trending 管线为模板：

```
discovery/github-search.ts      → implements Discovery（GitHub Search API，替代 Trending 爬取）
fetcher/<new-fetcher>.ts        → implements Fetcher<T>（新数据类型）
storage/<new-storage>.ts        → implements Storage<T>（新存储后端）
definitions/<new-job>.job.ts    → implements Job（新调度任务，组合 Discovery + Fetcher + Storage）
app/api/jobs/<new-job>/route.ts → 对应 API 端点
```

### 依赖

- `cheerio` — HTML 解析（GitHub Trending 页面爬取）
- `@supabase/supabase-js` — Supabase 服务端直连客户端（storage/supabase.ts 使用，绕过 `@supabase/ssr`）
- 可选 `GITHUB_TOKEN` 环境变量 — 提升 API 速率限制

## i18n

- **Supported locales:** `en` (default), `zh`, `tw`
- **Locale prefix mode:** `as-needed` — default locale (`en`) gets no URL prefix; `zh` and `tw` get `/zh/` and `/tw/` prefixes
- **Helper functions** exported from `src/i18n/routing.ts`: `Link`, `redirect`, `usePathname`, `useRouter` (navigation-aware), plus `isDefaultLocale()` and `localePrefix()`
- **Config files:** `src/i18n/request.ts`, `src/i18n/routing.ts`

## Notes

- This project was stripped from a larger markmap app — only i18n routing, locale switching, and Supabase auth scaffolding remain.
- All user-facing strings must go through `next-intl` translations, not hardcoded.
- Keep new pages under `src/app/[locale]/`.
- Row-Level Security (RLS) should be enforced in Supabase for any data access — the anon key is public.
- Comments in this codebase are written in Chinese.
