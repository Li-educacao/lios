# LIOS — LI Operational System

## Overview
Internal operational platform for LI Educação Online. Hub with public landing page + authenticated area with modular sectors (Marketing, Pedagógico). Carousel Creator is the first active module under Social Media.

## Tech Stack
- Frontend: React 19 + Vite 6 + TypeScript + TailwindCSS v4 + Radix UI
- Backend: Express + TypeScript
- LLM: Google Gemini API (carousel text generation)
- Image: Google Imagen 4 + Node Canvas + Sharp
- Database: Supabase (PostgreSQL + Auth + Storage + RBAC)
- Deploy: Vercel (frontend) + Railway (API)

## Commands
- `npm run dev` — Start all (api + web)
- `npm run dev:api` — Start API only (port 3001)
- `npm run dev:web` — Start frontend only (port 5173)
- `npm run build` — Build all
- `npm run lint` — Lint all

## Project Structure
```
lios/
  apps/
    api/src/
      modules/social-media/     ← carousel routes + services
      middleware/                ← auth, rbac, cors
      routes/index.ts           ← aggregates module routers
    web/src/
      modules/social-media/     ← carousel pages + components + hooks
      components/               ← AppShell, LandingPage, ui/
      contexts/                 ← AuthContext, ToastContext
      hooks/                    ← usePermissions
      pages/                    ← Login, ForgotPassword, ResetPassword, ComingSoon
  packages/shared/              ← types + constants
  supabase/migrations/          ← SQL migrations (RBAC, schema)
```

## Routing
```
/                    → Landing page (public)
/login               → Login (public)
/forgot-password     → Reset (public)
/reset-password      → Reset confirm (public)
/app                 → Redirect to /app/social-media
/app/social-media/*  → Carousel Creator (protected)
/app/campanhas       → "Em breve"
/app/criativos       → "Em breve"
/app/cursos          → "Em breve"
/app/admin           → Admin (admin role only)
```

## RBAC
- Tables: core_profiles, core_roles, core_permissions, core_role_permissions, core_user_roles
- Roles: admin, marketing, pedagogico
- Permissions: social-media:read, social-media:write, social-media:admin
- RLS: 3-layer pattern (ENABLE + FORCE + REVOKE anon)
- Backend: `requirePermission()` and `requireRole()` middleware
- Frontend: `usePermissions()` hook

## Design Tokens
- Colors: #010101 (black), #080808 (surface), #0f0f0f (surface-2), #1a1a1a (border)
- Blue (Marketing): #0084C8 / #0E4C93
- Green (Pedagógico): #00B37E / #00875F
- Fonts: MADE Tommy (ExtraBold, Bold, Medium, Regular, Light)
- Icons: lucide-react

## Infrastructure

| Service | Account/Org | URL/Ref |
|---------|-------------|---------|
| **GitHub** | `Li-educacao` | `Li-educacao/lios` |
| **Supabase** | LI Educação | ref: `tqpkymereiyfxroiuaip` — https://tqpkymereiyfxroiuaip.supabase.co |
| **Vercel** | li-educacaos-projects | lieducacaoonline.com.br |
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
- Module-based code organization (modules/social-media/)
- LIOS color tokens: bg-lios-*, text-lios-* (alongside legacy brand-* tokens)
