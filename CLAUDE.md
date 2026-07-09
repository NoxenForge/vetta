# i18n-starter

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
- **i18n:** next-intl v4 — `[locale]` prefix routing (en / zh / tw)
- **Output:** standalone mode

## Project Structure

```
src/
├── app/
│   ├── layout.tsx            # Root layout (redirects to default locale)
│   ├── not-found.tsx         # Global 404
│   └── [locale]/
│       ├── layout.tsx        # Locale layout (fonts, i18n provider)
│       ├── page.tsx          # Home page
│       └── globals.css       # Tailwind + custom styles
├── i18n/
│   ├── request.ts            # next-intl config (server-side)
│   └── routing.ts            # Locale routing config
├── locales/
│   ├── en/common.json
│   ├── zh/common.json
│   └── tw/common.json
└── middleware.ts             # next-intl middleware
```

## i18n

- **Supported locales:** `en`, `zh`, `tw`
- **Default locale:** `en`
- **Locale detection:** URL prefix (`/en/...`, `/zh/...`, `/tw/...`)
- **Middleware:** configured via `next-intl` middleware in `src/middleware.ts`
- **Config files:** `src/i18n/request.ts`, `src/i18n/routing.ts`

## Notes

- This project was stripped from a larger markmap app — only i18n routing and locale switching remain.
- No database or API routes yet. Keep new features in `src/app/[locale]/`.
- All user-facing strings should go through `next-intl` translations, not hardcoded.
