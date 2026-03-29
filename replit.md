# Design Bees Outbound Revenue Engine

An internal sales outreach tool for a design subscription business. Built as a React+Vite frontend with an Express 5 backend, Replit PostgreSQL, and Drizzle ORM.

## Architecture

### Artifacts
- **`artifacts/outbound-engine`** — React+Vite SPA frontend, served at `/`
- **`artifacts/api-server`** — Express 5 REST API, served at port 8080

### Shared Libraries
- **`lib/db`** — Drizzle ORM schema + db client (`@workspace/db`)
- **`lib/api-spec`** — OpenAPI 3.1 spec (`lib/api-spec/openapi.yaml`)
- **`lib/api-client-react`** — Generated React Query hooks from OpenAPI spec (`@workspace/api-client-react`)
- **`lib/api-zod`** — Generated Zod validation schemas from OpenAPI spec (`@workspace/api-zod`)

## Database Schema (PostgreSQL via Drizzle)

All tables follow the brief's Prisma schema, translated to Drizzle:
- `users` — internal auth users (email + bcrypt password_hash)
- `accounts` — target companies (ICP, fit score, priority tier)
- `contacts` — people at accounts (seniority, outreach status)
- `analyses` — homepage design analysis results (9 scoring dimensions)
- `issue_clusters` — issue taxonomy by code
- `insight_blocks` — ICP-specific insight templates per issue
- `sequences` — outreach sequence definitions
- `sequence_steps` — individual steps within sequences
- `message_templates` — channel-specific message templates
- `prospect_sequences` — tracks contacts through sequences
- `activities` — logged outreach activities (email/linkedin/phone/video)
- `replies` — classified reply records
- `assets` — design tools and resources
- `asset_usages` — tracks asset sharing per contact
- `opportunities` — pipeline deals (booked → closed)
- `experiments` — A/B test tracking
- `events` — audit log
- `playbook_entries` — operational playbook content
- `settings` — per-user configuration (encrypted API keys, sender info)

## API Routes

All mounted under `/api`:

| Prefix | Routes |
|--------|--------|
| `/api/auth` | POST /login, POST /logout, GET /me |
| `/api/accounts` | CRUD + POST /import |
| `/api/contacts` | CRUD |
| `/api/analyses` | CRUD |
| `/api/insights` | CRUD (insight blocks) |
| `/api/sequences` | GET + POST |
| `/api/activities` | GET + POST |
| `/api/opportunities` | GET + POST + PUT /:id |
| `/api/experiments` | GET + POST + PUT /:id |
| `/api/dashboard/metrics` | GET KPIs |
| `/api/dashboard/pipeline` | GET pipeline stage counts |
| `/api/dashboard/activity-today` | GET hot prospects + recent activity |
| `/api/settings` | GET + POST |

## Frontend Pages (Phase 1)

| Route | Status |
|-------|--------|
| `/login` | ✅ Full — email/password auth |
| `/dashboard` | ✅ Full — 6 KPIs, pipeline snapshot, hot prospects, quick actions |
| `/accounts` | ✅ Full — table with search, new account dialog, /accounts/:id detail |
| `/contacts` | ✅ Full — table with search, outreach status badges, new contact dialog |
| `/settings` | ✅ Full — API keys, sender info, analyser config |
| `/analyses`, `/issues`, `/insights`, `/messages`, `/sequences`, `/queue`, `/inbox`, `/calls`, `/opportunities`, `/assets`, `/experiments`, `/playbook` | ⏳ "Coming Soon" placeholder |

## Authentication

Session-based authentication using `express-session` + `bcryptjs`. No Supabase.
- Seed user: `admin@designbees.com` / `admin123`
- Sessions stored in memory (upgrade to pg-session-store for production)

## Stack Decisions (vs. Brief)

| Brief Specified | Actual Implementation |
|-----------------|----------------------|
| Next.js 14 | React + Vite (not supported as artifact) |
| Supabase Auth | Session auth (bcryptjs + express-session) |
| Supabase PostgreSQL | Replit built-in PostgreSQL |
| Prisma ORM | Drizzle ORM |

## Code Generation

To regenerate the API client after changing `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```

To push DB schema changes:
```bash
pnpm --filter @workspace/db run push
```
