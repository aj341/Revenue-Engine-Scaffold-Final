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
| `/api/accounts` | CRUD + POST /import (domain dedup + derived fields) |
| `/api/contacts` | CRUD + POST /import (email dedup + seniority normalisation) |
| `/api/analyses` | CRUD |
| `/api/analyze` | POST — calls external homepage analyser, upserts analysis + computes derived fields on account |
| `/api/issues` | GET list of 16 static issue clusters with account counts; GET /:code detail |
| `/api/insights` | Full CRUD + bulk-import + multi-filter (issueCode, icp, channel, active, search) |
| `/api/sequences` | Full CRUD with steps (create/update replaces steps), GET /:id/steps |
| `/api/prospect-sequences` | GET + POST (assign sequence to account/contact), PUT /:id |
| `/api/execution-queue` | GET (filter: today/overdue/week/all, channel), POST /:id/send, /skip, /pause |
| `/api/generate-message` | POST — Anthropic claude-sonnet-4-6, returns 3 message variants as JSON |
| `/api/message-templates` | GET + POST (save generated variants as reusable templates) |
| `/api/activities` | GET + POST |
| `/api/opportunities` | GET + POST + PUT /:id |
| `/api/experiments` | GET + POST + PUT /:id |
| `/api/dashboard/metrics` | GET KPIs |
| `/api/dashboard/pipeline` | GET pipeline stage counts |
| `/api/dashboard/activity-today` | GET hot prospects + recent activity |
| `/api/settings` | GET + POST |

## Frontend Pages (Phase 2 — all wired in App.tsx)

| Route | Status |
|-------|--------|
| `/login` | ✅ Full — email/password auth |
| `/dashboard` | ✅ Full — 6 KPIs, pipeline snapshot, hot prospects, quick actions |
| `/accounts` | ✅ Full — table with search, new account button |
| `/accounts/new` | ✅ Full — manual entry form |
| `/accounts/import` | ✅ Full — CSV wizard: drag/drop, column mapping, validation, dedup report |
| `/accounts/:id` | ✅ Full — 12 sections: overview, derived fields, analyses, activity, contacts, opportunities |
| `/contacts` | ✅ Full — table with search, outreach status badges |
| `/contacts/new` | ✅ Full — manual entry with account picker, auto seniority detection |
| `/contacts/import` | ✅ Full — CSV import wizard |
| `/contacts/:id` | ✅ Full — profile header, edit form, linked account, activity timeline |
| `/analyses` | ✅ Full — filterable list (issue code, ICP, date range) |
| `/analyses/:id` | ✅ Full — score circle, 9 gauges, issue cards, strengths |
| `/issues` | ✅ Full — 16 issue cluster card grid with account counts |
| `/issues/:code` | ✅ Full — accounts with this issue, insight blocks, recommended sequences |
| `/settings` | ✅ Full — API keys, sender info, analyser config |
| `/insights` | ✅ Phase 3 — Table/card toggle, sidebar filters (issue/ICP/channel/active), search, pagination, bulk JSON import |
| `/insights/new` | ✅ Phase 3 — Create form with live email preview |
| `/insights/:id` | ✅ Phase 3 — Edit/duplicate/delete with live preview split-pane |
| `/messages` | ✅ Phase 3 — Anthropic message generator, 3-column layout: context / variants / controls. Save as template, copy, expand. |
| `/sequences` | ✅ Phase 3 — Sequence list with ICP/status filters, step bar visualization |
| `/sequences/new` | ✅ Phase 3 — Sequence editor: step timeline, step editor, settings panel |
| `/sequences/:id` | ✅ Phase 3 — Same editor, loads existing sequence |
| `/queue` | ✅ Phase 3 — Execution queue with today/overdue/week/all filters, channel filter, Send/Skip/Pause with confirmation modal |
| `/inbox`, `/calls`, `/opportunities`, `/assets`, `/experiments`, `/playbook` | ⏳ "Coming Soon" placeholder |

## Phase 3 — Account Detail Enhancements
- **Assign Sequence modal** on account detail sidebar: loads active sequences, lets you pick a sequence + optional contact, calls `POST /api/prospect-sequences`, shows confirmation toast.
- **Generate Message** button deep-links to `/messages?accountId=<id>` (prefills context from existing contacts/analyses).

## Phase 2 Derived Fields (on accounts)

| Field | Logic |
|-------|-------|
| `likelyPrimaryProblem` | top issue code from analysis |
| `likelySecondaryProblem` | second issue code from analysis |
| `personalizationLevel` | `high_touch` if sequenceFamily=strategic, `moderate` if fitScore≥75, else `generic` |
| `suggestedSequenceFamily` | derived from issue code + ICP + tier |
| `knownChallenges` | JSONB array of issue codes from analysis |
| `description` | auto-generated from company profile |

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
