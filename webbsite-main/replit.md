# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Smart Greenhouse as a Service (`artifacts/smart-greenhouse`)
- **Kind**: react-vite web app
- **Preview path**: `/`
- **Framework**: React + Vite + Tailwind CSS + Framer Motion
- **Description**: Full landing website for the KITSW CSE(IoT) Smart Greenhouse project
- **Sections**: Hero, About, Problem Statement, How It Works, Technology, Gallery, Team, Crop Growth, Results/Harvest, Why It Matters, Achievements, Contact
- **Images**: Uses 11 real project photos from `attached_assets/` via `@assets/` import alias
- **Font**: Playfair Display (serif headings) + Plus Jakarta Sans (body) from Google Fonts
- **Color palette**: Deep forest green (#0d2b1a / #1a4a2e), lime accent (#a3d977), white backgrounds

### API Server (`artifacts/api-server`)
- **Kind**: Express API
- **Preview path**: `/api`
- **Framework**: Express 5 + Drizzle ORM

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
