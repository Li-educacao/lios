# LIOS Design System
## LI Operational System — LI Educação Online

**Version:** 1.0.0
**Date:** 2026-03-04
**Author:** Design System Lead
**Status:** Draft — ready for implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Design Tokens — Colors](#design-tokens--colors)
3. [Design Tokens — Typography](#design-tokens--typography)
4. [Design Tokens — Spacing & Layout](#design-tokens--spacing--layout)
5. [Design Tokens — Border Radius & Shadows](#design-tokens--border-radius--shadows)
6. [Landing Page Wireframe](#landing-page-wireframe)
7. [Authenticated Area Layout](#authenticated-area-layout)
8. [Component Library](#component-library)
9. [CSS Theme (Tailwind v4)](#css-theme-tailwind-v4)
10. [What to Keep vs Change from Carousel Creator](#what-to-keep-vs-change-from-carousel-creator)

---

## Overview

LIOS is the internal operational platform for LI Educação Online. It serves two audiences:

- **Visitors** — public landing page presenting the company and inviting team members to log in
- **Internal team** — authenticated area organized in two operational sectors: Marketing and Pedagógico

The design inherits and extends the existing Carousel Creator design language. The goal is visual consistency across all LI Educação products while introducing a second accent color (green) to distinguish the platform identity from Carousel Creator (which uses blue exclusively).

---

## Design Tokens — Colors

### Palette Rationale

- **Black base** — maintained from Carousel Creator. Signals focus and professionalism.
- **Blue (primary)** — inherited, represents technology and trust. Used for primary CTAs and active states.
- **Green (secondary)** — new token. Represents education, growth, and the pedagogical dimension. Used for the Pedagógico sector and success states.
- **Neutrals** — expanded from single gray to a 4-step scale for better hierarchy.
- **Status colors** — red, amber, green, blue for system feedback.

### Color Table

| Token Name | Hex Value | Usage |
|---|---|---|
| `--color-lios-black` | `#010101` | Page background, sidebar background |
| `--color-lios-surface` | `#080808` | Sidebar, card surfaces (elevated from black) |
| `--color-lios-surface-2` | `#0f0f0f` | Secondary surfaces, input backgrounds |
| `--color-lios-border` | `#1a1a1a` | Dividers, card borders (replaces gray/10) |
| `--color-lios-white` | `#ffffff` | Primary text, icons on dark |
| `--color-lios-gray-400` | `#76777a` | Secondary text, placeholder text, inactive icons |
| `--color-lios-gray-300` | `#9a9b9e` | Tertiary text, timestamps |
| `--color-lios-gray-200` | `#c4c5c7` | Disabled text |
| `--color-lios-blue` | `#0084c8` | Primary CTA, active nav items, links, Marketing sector |
| `--color-lios-blue-dark` | `#0e4c93` | Blue hover states, card borders on hover, focus rings |
| `--color-lios-blue-subtle` | `rgba(0,132,200,0.12)` | Active nav background, blue badge bg |
| `--color-lios-green` | `#00b37e` | Pedagógico sector accent, success states |
| `--color-lios-green-dark` | `#00875f` | Green hover states |
| `--color-lios-green-subtle` | `rgba(0,179,126,0.12)` | Pedagógico nav background, green badge bg |
| `--color-lios-red` | `#e03d3d` | Error states, destructive actions |
| `--color-lios-red-subtle` | `rgba(224,61,61,0.12)` | Error badge background |
| `--color-lios-amber` | `#e08c00` | Warning states, pending status |
| `--color-lios-amber-subtle` | `rgba(224,140,0,0.12)` | Warning badge background |

### Sector Color Mapping

| Sector | Primary Color | Subtle Background | Border |
|---|---|---|---|
| Marketing | `lios-blue` (#0084c8) | `lios-blue-subtle` | `lios-blue-dark` |
| Pedagógico | `lios-green` (#00b37e) | `lios-green-subtle` | `lios-green-dark` |
| System / Admin | `lios-gray-400` | `border/10` | `lios-border` |

---

## Design Tokens — Typography

### Font Strategy

MADE Tommy is already available in the project. LIOS keeps all five weights and adds a semantic role system.

| Role | Font | Weight | Tailwind Class |
|---|---|---|---|
| Display | MADE Tommy ExtraBold | 800 | `font-heading` |
| Heading | MADE Tommy Bold | 700 | `font-heading-bold` |
| Subtitle | MADE Tommy Medium | 500 | `font-subtitle` |
| Body | MADE Tommy Regular | 400 | `font-body` |
| Caption | MADE Tommy Light | 300 | `font-caption` |

### Type Scale

| Name | Size | Line Height | Usage |
|---|---|---|---|
| `text-display` | 3.5rem (56px) | 1.1 | Landing page hero headline |
| `text-h1` | 2.5rem (40px) | 1.2 | Page titles (landing) |
| `text-h2` | 2rem (32px) | 1.25 | Section headings |
| `text-h3` | 1.5rem (24px) | 1.3 | Card headings, sidebar group labels |
| `text-h4` | 1.25rem (20px) | 1.35 | Sub-section headings |
| `text-lg` | 1.125rem (18px) | 1.5 | Lead body text, feature descriptions |
| `text-base` | 1rem (16px) | 1.5 | Standard body text |
| `text-sm` | 0.875rem (14px) | 1.5 | Nav items, labels, secondary text |
| `text-xs` | 0.75rem (12px) | 1.5 | Captions, badges, timestamps |

---

## Design Tokens — Spacing & Layout

### Spacing Scale

Uses an 8px base unit. All spacing values are multiples of 4px.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon internal padding, tight gaps |
| `space-2` | 8px | Small gaps between inline elements |
| `space-3` | 12px | Gap between icon and label in nav items |
| `space-4` | 16px | Standard card padding (small) |
| `space-5` | 20px | Standard element padding |
| `space-6` | 24px | Card padding, section internal spacing |
| `space-8` | 32px | Section gaps, content area padding |
| `space-10` | 40px | Large section padding |
| `space-12` | 48px | Hero section vertical padding |
| `space-16` | 64px | Between major landing page sections |
| `space-24` | 96px | Hero section height baseline |

### Layout Dimensions

| Element | Value | Notes |
|---|---|---|
| Sidebar width | `240px` (w-60) | Inherited from Carousel Creator |
| Sidebar collapsed | `64px` (w-16) | Future: collapsible mode |
| Max content width | `1280px` | Landing page max-w |
| Content area padding (x) | `32px` (px-8) | On desktop |
| Content area padding (y) | `24px` (py-6) | Standard page top padding |
| Navbar height | `64px` (h-16) | Fixed navbar on landing page |
| Header height (authenticated) | `56px` (h-14) | Top bar in authenticated area |

---

## Design Tokens — Border Radius & Shadows

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | `6px` | Badges, small tags |
| `radius-md` | `8px` | Inputs, buttons (sm) |
| `radius-lg` | `12px` | Cards, nav items, modals |
| `radius-xl` | `16px` | Large cards, panels |
| `radius-2xl` | `24px` | Landing page hero cards |
| `radius-full` | `9999px` | Avatars, pill badges |

### Shadows (dark theme)

| Token | Value | Usage |
|---|---|---|
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)` | Standard card elevation |
| `shadow-modal` | `0 8px 32px rgba(0,0,0,0.8)` | Modals, popovers |
| `shadow-blue-glow` | `0 0 20px rgba(0,132,200,0.25)` | CTA button hover on landing page |
| `shadow-green-glow` | `0 0 20px rgba(0,179,126,0.25)` | Pedagógico accent glow |

---

## Landing Page Wireframe

### Overall Structure

```
┌─────────────────────────────────────────────────────────────┐
│ NAVBAR (fixed, bg-lios-surface/80 backdrop-blur)           │
│ [Logo + LIOS] ──────────────── [Sobre] [Setores] [Entrar →] │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SECTION 1 — HERO (full viewport height, bg-lios-black)     │
│                                                             │
│              ┌──────────────────────┐                       │
│              │  [LI Educação badge] │                       │
│              │                      │                       │
│              │  Operações internas  │                       │
│              │  na velocidade da    │                       │
│              │  educação moderna    │ ← display text       │
│              │                      │                       │
│              │  Subtítulo: LIOS     │                       │
│              │  centraliza Marketing│                       │
│              │  e Pedagógico em um  │                       │
│              │  único lugar.        │                       │
│              │                      │                       │
│              │  [Acessar plataforma]│ ← primary CTA (blue) │
│              └──────────────────────┘                       │
│                                                             │
│  Background: subtle grid pattern overlay on black           │
│  Two small floating cards (decorative) — left and right     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SECTION 2 — SOBRE / O QUE FAZEMOS                          │
│ bg-lios-surface                                             │
│                                                             │
│   "LI Educação Online"                        [badge]       │
│   Conectando gestão, pedagogia e marketing                  │
│                                                             │
│   Paragraph: Somos uma empresa de educação online...        │
│                                                             │
│   ┌─────────────────┐  ┌─────────────────┐                 │
│   │  Marketing      │  │  Pedagógico     │                 │
│   │  ─────────────  │  │  ─────────────  │                 │
│   │  [Blue icon]    │  │  [Green icon]   │                 │
│   │  Campanhas,     │  │  Conteúdo,      │                 │
│   │  criativos,     │  │  cursos,        │                 │
│   │  tráfego pago   │  │  alunos         │                 │
│   └─────────────────┘  └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SECTION 3 — SETORES DETALHADOS                             │
│ bg-lios-black                                               │
│                                                             │
│  ── Marketing ─────────────────────────────────────────── │
│  Left: text block                Right: feature list        │
│  "Controle total do              • Gestão de campanhas      │
│   tráfego pago e                 • Biblioteca de criativos  │
│   criativos"                     • Análise de métricas      │
│                                  • Integração Meta/Google   │
│                                                             │
│  ── Pedagógico ────────────────────────────────────────── │
│  Left: feature list              Right: text block          │
│  • Gestão de cursos              "Tudo que sua equipe       │
│  • Acompanhamento de alunos       pedagógica precisa"       │
│  • Criação de conteúdo                                      │
│  • Relatórios de aprendizado                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SECTION 4 — BENEFÍCIOS / FEATURES                          │
│ bg-lios-surface                                             │
│                                                             │
│  "Por que usar o LIOS?"          [subtitle]                │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ [Icon]   │  │ [Icon]   │  │ [Icon]   │  │ [Icon]   │  │
│  │ Tudo em  │  │ Acesso   │  │ Seguro e │  │ Rápido e │  │
│  │ um lugar │  │ por setor│  │ privado  │  │ moderno  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  4-column grid on desktop, 2-column on tablet, 1 on mobile  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SECTION 5 — CTA FINAL                                      │
│ bg-lios-black, centered                                     │
│                                                             │
│         "Pronto para começar?"                              │
│         Acesse a plataforma com sua conta.                  │
│                                                             │
│         [Entrar no LIOS →]  ← large primary button         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FOOTER                                                      │
│ bg-lios-surface border-t border-lios-border                │
│                                                             │
│  LI Educação Online         © 2026 LI Educação Online      │
│  lieducacaoonline.com.br    Todos os direitos reservados    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Navbar Specification

- **Position:** `fixed top-0 left-0 right-0 z-50`
- **Background:** `bg-lios-surface/80 backdrop-blur-md`
- **Border:** `border-b border-lios-border`
- **Height:** `h-16`
- **Content:**
  - Left: Logo mark (small icon) + "LIOS" wordmark (font-heading, text-lios-blue)
  - Center (desktop): Navigation links — "Sobre", "Setores", "Contato" (text-sm font-subtitle text-lios-gray-400 hover:text-white)
  - Right: "Entrar" button (variant: primary, size: sm)
- **Mobile:** Hamburger menu replaces center links. "Entrar" always visible.

### Hero Section Specification

- **Layout:** Full viewport height (`min-h-screen`), centered content
- **Background:** `bg-lios-black` with a subtle `background-image` CSS grid pattern (1px lines, rgba(255,255,255,0.04))
- **Content alignment:** Centered horizontally, vertically centered with slight upward offset
- **Badge:** Small pill above headline — "LI Educação Online" with blue border and text
- **Headline:** `text-display font-heading text-white` — approximately 56px, two lines
- **Sub-headline:** `text-lg font-body text-lios-gray-400` — 2–3 lines
- **CTA button:** Large (`size: lg`), variant primary, with subtle blue glow on hover
- **Decorative elements:** Two floating semi-transparent cards left and right of center content. Left card shows a Marketing metric mockup. Right card shows a Pedagógico summary mockup. Both use `bg-lios-surface border-lios-border shadow-card`. These are pure decoration — no interactivity.

### Section Rhythm

- Even sections: `bg-lios-black`
- Odd sections: `bg-lios-surface`
- Section padding: `py-24` (96px top/bottom) on desktop, `py-16` on mobile
- Max width container: `max-w-7xl mx-auto px-8` on desktop, `px-4` on mobile

---

## Authenticated Area Layout

### Overall Shell

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (fixed top, full width, h-14)                       │
│ [Menu toggle]  Breadcrumb: Setor > Módulo > Página  [User] │
└─────────────────────────────────────────────────────────────┘
│                                                             │
│ ┌────────────┐  ┌───────────────────────────────────────┐  │
│ │  SIDEBAR   │  │  MAIN CONTENT AREA                    │  │
│ │  w-60      │  │  flex-1, overflow-auto                │  │
│ │            │  │  bg-lios-black                        │  │
│ │  [Logo]    │  │                                       │  │
│ │            │  │  Page-specific content renders here   │  │
│ │  ▼ MARKETI │  │                                       │  │
│ │   Campanhas│  │                                       │  │
│ │   Criativos│  │                                       │  │
│ │   Métricas │  │                                       │  │
│ │            │  │                                       │  │
│ │  ▼ PEDAGÓG │  │                                       │  │
│ │   Cursos   │  │                                       │  │
│ │   Alunos   │  │                                       │  │
│ │   Conteúdo │  │                                       │  │
│ │            │  │                                       │  │
│ │  ─────     │  │                                       │  │
│ │  [Avatar]  │  │                                       │  │
│ │  Nome user │  │                                       │  │
│ │  [Sair]    │  │                                       │  │
│ └────────────┘  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar Specification

**Dimensions and Base**
- Width: `w-60` (240px), fixed on desktop
- Background: `bg-[#080808]` (same as Carousel Creator)
- Border: `border-r border-lios-border`
- Structure: flex column, full height

**Logo Area** (top)
- Height: `h-14` (matches header)
- Border: `border-b border-lios-border`
- Content: Small LIOS logotype — icon mark + "LIOS" wordmark (font-heading, text-lios-blue)
- Padding: `px-4`

**Navigation Groups**

Each sector is a collapsible group with a header and sub-items.

```
Group header (not clickable — just a label + chevron):
  Padding: px-3 py-2
  Text: text-xs font-subtitle uppercase tracking-wider text-lios-gray-400
  Chevron: right side, rotates when expanded

Sub-item (clickable nav link):
  Padding: px-3 py-2.5
  Icon: 18px, left-aligned, gap-3
  Text: text-sm font-subtitle
  Corner radius: rounded-lg

  States:
  - Default:   text-lios-gray-400, icon text-lios-gray-400
  - Hover:     text-white, bg-white/5
  - Active (Marketing): bg-lios-blue-subtle, text-lios-blue, icon text-lios-blue
  - Active (Pedagógico): bg-lios-green-subtle, text-lios-green, icon text-lios-green
```

**Marketing Group — Sub-modules**

| Module | Icon (lucide-react) | Path |
|---|---|---|
| Dashboard | `LayoutDashboard` | /marketing |
| Campanhas | `Target` | /marketing/campanhas |
| Criativos | `Palette` | /marketing/criativos |
| Mídias | `Image` | /marketing/midias |
| Métricas | `BarChart3` | /marketing/metricas |
| Relatórios | `FileText` | /marketing/relatorios |

**Pedagógico Group — Sub-modules**

| Module | Icon (lucide-react) | Path |
|---|---|---|
| Dashboard | `LayoutDashboard` | /pedagogico |
| Cursos | `BookOpen` | /pedagogico/cursos |
| Alunos | `Users` | /pedagogico/alunos |
| Conteúdo | `FileEdit` | /pedagogico/conteudo |
| Carrossel | `Layers` | /pedagogico/carrossel |
| Relatórios | `FileText` | /pedagogico/relatorios |

**User Footer**
- Border top: `border-t border-lios-border`
- Padding: `px-3 py-4`
- Avatar: 32px circle, bg-lios-surface-2, initials text
- Name: `text-sm font-subtitle text-white truncate`
- Email: `text-xs font-body text-lios-gray-400 truncate`
- Logout button: `text-sm font-subtitle text-lios-gray-400 hover:text-red-400 hover:bg-red-500/10`

**Mobile Behavior**
- Sidebar hidden by default (`-translate-x-full`)
- Menu button in header triggers slide-in
- Dark overlay behind open sidebar (`bg-black/60`)
- Behavior matches existing Carousel Creator implementation

### Header Specification

```
┌──────────────────────────────────────────────────────────┐
│ [Menu btn]  Marketing > Campanhas > Visão Geral  [User ▼]│
└──────────────────────────────────────────────────────────┘
```

- **Height:** `h-14` (56px)
- **Background:** `bg-lios-surface border-b border-lios-border`
- **Left:** Mobile menu toggle (hidden on desktop) + Breadcrumb
- **Right:** User avatar (32px) + name, dropdown with "Configurações" and "Sair"

**Breadcrumb**
- Separator: `/` or `ChevronRight` icon (16px, text-lios-gray-400)
- Sector: text-lios-blue (Marketing) or text-lios-green (Pedagógico)
- Current page: `text-white font-subtitle`
- Intermediate: `text-lios-gray-400 hover:text-white`

### Content Area Specification

- **Background:** `bg-lios-black`
- **Padding:** `p-6` (24px all sides) on desktop, `p-4` on mobile
- **Max width:** content fills available space, no artificial max-width (grid handles it)
- **Page structure:**
  ```
  <page-wrapper>
    <page-header>
      <h1 font-heading text-white>Page Title</h1>
      <p font-body text-lios-gray-400>Description</p>
      [optional: action buttons right-aligned]
    </page-header>
    <page-content>
      [dashboard grid / table / form]
    </page-content>
  </page-wrapper>
  ```

---

## Component Library

### Tier 1 — Carry over from Carousel Creator (reuse as-is)

These components are already well-implemented and should be imported or copied directly:

| Component | File | Notes |
|---|---|---|
| `Button` | `components/ui/Button.tsx` | Add `outline` variant for landing page |
| `Input` | `components/ui/Input.tsx` | No changes needed |
| `Textarea` | `components/ui/Textarea.tsx` | No changes needed |
| `Card` | `components/ui/Card.tsx` | No changes needed |
| `Badge` | `components/ui/Badge.tsx` | Add green variant |
| `Modal` | `components/ui/Modal.tsx` | No changes needed |
| `Toast` + `ToastContext` | `components/Toast.tsx` | No changes needed |
| `Layout` (sidebar shell) | `components/Layout.tsx` | Extend with sector groups |

### Tier 2 — Extend from Carousel Creator (modify)

| Component | Change Required |
|---|---|
| `Button` | Add `outline` variant: transparent bg, border-lios-blue, text-lios-blue |
| `Badge` | Add `success` (green) and `warning` (amber) variants |
| `NavLink` | Extend to accept `accentColor` prop: `'blue' | 'green'` |
| `Layout` | Extend sidebar to support collapsible sector groups with chevrons |

### Tier 3 — New Components to Build for LIOS

**Landing Page Components**

| Component | Description |
|---|---|
| `Navbar` | Fixed top navbar with logo, nav links, CTA button, mobile hamburger |
| `HeroSection` | Full-viewport hero with headline, subtitle, CTA, decorative cards |
| `SectorCard` | Two-column card: icon + sector name + feature list (Marketing / Pedagógico) |
| `FeatureGrid` | 4-column grid of icon + title + description cards |
| `CTABanner` | Centered CTA section with large headline and primary button |
| `Footer` | Two-column: brand info + copyright |
| `DecorativeCard` | Floating glassmorphism cards for hero background |

**Authenticated Area Components**

| Component | Description |
|---|---|
| `SidebarGroup` | Collapsible nav group with label + chevron + animated collapse |
| `SidebarGroupItem` | Nav item with sector-aware active color (blue or green) |
| `AppHeader` | Top header with mobile menu toggle, breadcrumb, user dropdown |
| `Breadcrumb` | Composable breadcrumb with sector color on root item |
| `UserMenu` | Dropdown with avatar, name, email, settings link, logout |
| `PageHeader` | Consistent page top: h1 + description + optional action area |
| `StatCard` | Dashboard metric card: label + number + trend indicator |
| `SectorBadge` | Pill badge: "Marketing" (blue) or "Pedagógico" (green) |
| `Avatar` | Initials-based avatar, 3 sizes (sm/md/lg), rounded-full |
| `DataTable` | Sortable table with pagination, loading skeleton |
| `EmptyState` | Centered icon + message + optional CTA for empty pages |
| `LoadingSkeleton` | Animated pulse skeleton for async content |
| `Tooltip` | Radix UI tooltip with dark theme styling |
| `Dropdown` | Radix UI DropdownMenu with dark theme styling |
| `Tabs` | Radix UI Tabs styled for dark bg, with blue/green underline |

---

## CSS Theme (Tailwind v4)

The following block goes in `index.css` and replaces / extends the existing Carousel Creator theme when building LIOS as a standalone app. If LIOS shares the same codebase as Carousel Creator, add the LIOS-prefixed tokens alongside the existing `brand-*` tokens.

```css
@theme {
  /* ── Base colors (same as Carousel Creator) ── */
  --color-brand-black:      #010101;
  --color-brand-white:      #ffffff;
  --color-brand-gray:       #76777a;
  --color-brand-blue:       #0084c8;
  --color-brand-blue-dark:  #0e4c93;

  /* ── LIOS extended palette ── */
  --color-lios-black:       #010101;
  --color-lios-surface:     #080808;
  --color-lios-surface-2:   #0f0f0f;
  --color-lios-border:      #1a1a1a;
  --color-lios-white:       #ffffff;

  /* Neutrals */
  --color-lios-gray-200:    #c4c5c7;
  --color-lios-gray-300:    #9a9b9e;
  --color-lios-gray-400:    #76777a;

  /* Primary — Blue (Marketing, CTAs) */
  --color-lios-blue:        #0084c8;
  --color-lios-blue-dark:   #0e4c93;

  /* Secondary — Green (Pedagógico) */
  --color-lios-green:       #00b37e;
  --color-lios-green-dark:  #00875f;

  /* Status */
  --color-lios-red:         #e03d3d;
  --color-lios-amber:       #e08c00;
  --color-lios-success:     #00b37e;

  /* ── Typography ── */
  --font-heading:    'MADE Tommy ExtraBold', sans-serif;
  --font-heading-bold: 'MADE Tommy Bold', sans-serif;
  --font-subtitle:   'MADE Tommy Medium', sans-serif;
  --font-body:       'MADE Tommy Regular', 'Inter', sans-serif;
  --font-caption:    'MADE Tommy Light', sans-serif;

  /* ── Border radius ── */
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  24px;
}
```

### Utility Classes to Add

```css
/* Sector-aware active nav states */
.nav-active-marketing {
  background-color: rgba(0, 132, 200, 0.12);
  color: var(--color-lios-blue);
}

.nav-active-pedagogico {
  background-color: rgba(0, 179, 126, 0.12);
  color: var(--color-lios-green);
}

/* Grid pattern for hero background */
.bg-grid-pattern {
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Glassmorphism for decorative hero cards */
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

---

## What to Keep vs Change from Carousel Creator

### KEEP — Exact Same

| Element | Value | Why |
|---|---|---|
| Background color | `#010101` | Consistent brand identity across LI Educação products |
| Sidebar surface | `#080808` | Proven dark surface that works with the palette |
| Sidebar width | `240px` (w-60) | Standard, no reason to change |
| Border opacity | `border-gray/10` pattern → `border-lios-border` | Subtle, professional |
| Blue (primary) | `#0084c8` | Core brand color, used for all CTAs |
| Blue dark | `#0e4c93` | Hover states, borders, focus rings |
| Gray (text) | `#76777A` | Secondary text already well-calibrated |
| MADE Tommy | All 5 weights | Distinctive, brand-specific font |
| Font role assignments | heading/subtitle/body | Correct hierarchy, no changes needed |
| Button component | All 4 variants | Add only `outline` for landing page |
| Nav item active style | `bg-blue/15 text-blue` | Keep for Marketing sector exactly as-is |
| Mobile sidebar behavior | translate-x trick | Well-implemented, reuse entirely |
| `cn()` utility | Same | Standard pattern |
| Radix UI + Tailwind stack | Same | No migration needed |
| Lucide icons | Same | Consistent icon set |

### CHANGE — Extend or Replace

| Element | Current (Carousel Creator) | LIOS Change | Reason |
|---|---|---|---|
| Single accent color | Only blue | Blue (Marketing) + Green (#00b37e) for Pedagógico | LIOS has two distinct sectors; color coding aids navigation |
| Flat nav structure | All items at same level | Two collapsible groups: Marketing / Pedagógico | Sector-based organization required |
| No breadcrumb | Not needed (shallow nav) | Required: Setor > Módulo > Página | LIOS has deeper hierarchy |
| Header | Mobile-only top bar | Persistent header on all breakpoints | LIOS needs breadcrumb + user dropdown always visible |
| No landing page | App goes straight to login | Full marketing landing page | Public-facing presentation needed |
| Login button position | Centered in page | Also in navbar (fixed) | Easier access from landing page |
| No sector badges | No concept | SectorBadge component | Needed to identify content ownership at a glance |
| Border dividers | `border-brand-gray/10` | `border-lios-border` (#1a1a1a) | Slightly more opaque for clarity on section boundaries |
| Surface color name | hardcoded `bg-[#080808]` | Named token `bg-lios-surface` | Maintainability |
| Badge variants | Not specified | Add success (green) + warning (amber) | Status communication needs |

### DO NOT DO

- Do not introduce a completely different color palette — the near-black + blue foundation is what ties LIOS to Carousel Creator and the LI Educação brand identity.
- Do not replace MADE Tommy — it is proprietary to the brand. Other fonts would break visual continuity.
- Do not use a white/light theme — the team is accustomed to dark UI across all LI Educação tools.
- Do not add a third accent color — two sectors, two colors. Adding more creates noise.
- Do not use shadcn/ui or other component libraries — the project already has Radix UI primitives with custom wrappers. Adding another system creates duplication.

---

## Implementation Priority

When building LIOS, implement in this order:

**Phase 1 — Foundation**
1. Copy CSS tokens into `index.css`
2. Copy/port Button, Input, Card, Badge, Modal, Toast from Carousel Creator
3. Build `Layout` (sidebar shell with sector groups)
4. Build `AppHeader` (breadcrumb + user menu)

**Phase 2 — Authenticated Area**
5. Build `SidebarGroup` + `SidebarGroupItem` with sector-aware colors
6. Build `PageHeader` component
7. Build `StatCard` for dashboards
8. Build `SectorBadge`

**Phase 3 — Landing Page**
9. Build `Navbar` (fixed, responsive)
10. Build `HeroSection` (with decorative cards)
11. Build `SectorCard` (Marketing + Pedagógico)
12. Build `FeatureGrid`
13. Build `CTABanner` + `Footer`

**Phase 4 — Data Components**
14. Build `DataTable` with pagination
15. Build `EmptyState` + `LoadingSkeleton`
16. Build `Tabs`, `Tooltip`, `Dropdown`

---

*LIOS Design System v1.0.0 — LI Educação Online — 2026-03-04*
