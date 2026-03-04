# Carousel Creator

## Overview
Instagram carousel creator for @lawhander (Climatronico). Generates text via Gemini AI, validates with user, renders images following brand design system.

## Tech Stack
- Frontend: React 19 + Vite 6 + TypeScript + TailwindCSS + Radix UI
- Backend: Express + TypeScript
- LLM: Google Gemini API
- Database: Supabase (PostgreSQL + Auth + Storage)
- Image: Node Canvas + Sharp

## Commands
- `npm run dev` — Start all (api + web)
- `npm run dev:api` — Start API only
- `npm run dev:web` — Start frontend only
- `npm run build` — Build all
- `npm run lint` — Lint all

## Design Tokens
- Colors: #010101 (black), #FFFFFF (white), #76777A (gray), #0084C8 (blue), #0E4C93 (blue-dark)
- Fonts: MADE Tommy ExtraBold (headings), Medium (subtitles), Regular (body)
- Slide formats: 1080x1080 (square), 1080x1350 (portrait 4:5)

## Infrastructure

| Service | Account/Org | URL/Ref |
|---------|-------------|---------|
| **GitHub** | `Li-educacao` | `Li-educacao/carousel-creator` |
| **Supabase** | LI Educação | ref: `tqpkymereiyfxroiuaip` — https://tqpkymereiyfxroiuaip.supabase.co |
| **Vercel** | li-educacaos-projects | https://carousel-creator-tau.vercel.app |
| **Railway** | Li-educacao | https://api-production-3f9b.up.railway.app |

### Env Vars (names only — values in .env and platform dashboards)

| Where | Variables |
|-------|-----------|
| **Railway (API)** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `PORT` |
| **Vercel (Web)** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `API_URL` |
| **Local (.env root)** | All of the above |

> CRITICAL: This project uses the **LI Educação** Supabase (`tqpkymereiyfxroiuaip`), NOT Grupo Lawteck (`qpfhircjexgbuolobqkf`). Never mix them.

## Patterns
- Use cn() from lib/utils for className merging
- Relative imports within each app
- pt-BR for all user-facing text
- API routes: /api/v1/{resource}
