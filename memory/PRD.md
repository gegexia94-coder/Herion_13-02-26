# Herion - Controlled Execution Platform (AI Practice Manager)

## Original Problem Statement
Build "Herion AI" — a controlled execution platform with orchestration of multiple specialized agents for fiscal and administrative practice management. All UI text in Italian. Codebase in English.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Manrope font
- **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based JWT
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend integration
- **Design**: Light, guided, human-first. CSS tokens (#FBFBFB, #E8F9FF, #C4D9FF, #C5BAFF), Brand teal #0ABFCF
- **Navigation**: 7-item left sidebar (Dashboard, Pratiche, Documenti, Agenti, Comunicazione, Ricerca, Supporto)
- **Brand**: Geometric "H" SVG logo (pill-shaped pillars + rounded bridge, #0ABFCF) + "Herion" + "Virtual Accountant"

## Core Product Rule
At every moment, the user must understand:
1. What this practice is
2. What is happening now
3. What is missing
4. What the user must do next
5. What Herion will do after that
6. Whether the process is internal or official/external

## What's Been Implemented

### Empty States, Agent Widget, Progress, Brand (Batch 15 — 2026-04-11)
- **Guided Empty States**: Every empty/waiting/blocked state now explains what's happening, why it matters, and what to do next. Applied to: Dashboard (no practices), Practices List (no results), Agent Widget (no activity), Search (no query/no results), Agents Page (no logs), Document Section (no docs).
- **Dashboard Agent Activity Widget**: "Attivita Agenti" compact widget showing active agent names, client names, OK/Active/Error statuses, with "Vedi tutto" link to Agents page. Backed by real agent_logs aggregation from practice data.
- **Progress Indicator**: 6-dot progress bar on every practice row in Practices List. Green = completed steps, teal = current step, gray = remaining. Red "!" for blocked practices. Maps the 6-step flow visually.
- **Brand Identity Refactor**: New geometric "H" SVG logo (inline SVG, no external image). Pill-shaped pillars with rounded bridge. Applied across: login, welcome, sidebar, mobile header, footer. Old network/tech icon removed entirely.

### Phase 1-4 Refactor (Batch 14 — 2026-04-11)
- **Pre-practice Understanding Gate**: "Prima di iniziare" screen on draft practices
- **6-Step Practice Flow**: Comprendi → Carica → Elabora → Verifica → Firma → Completa
- **Document Clarity System**: "Da caricare", "Ricevuto", "Generato da Herion", "Richiede firma", "Firmato (p7m)"
- **Expanded Status Semantics**: 16 backend statuses → 8 user-facing categories
- **Official Channel Layer**: Entity name, submission method, portal URL, who submits, authentication
- **New Endpoints**: POST /start, /mark-submitted, /mark-completed
- **Enriched Practice API**: catalog_info, channel_info, current_step, user_status

### Earlier Batches (1-13)
- Human-first UX, Priority System, Agent Pipeline, Dashboard, Auth, Catalog, Governance, Alerts, Vault, Follow-ups, Email Templates, Search, Support

## Testing Status
- Iteration 22: 100% — Empty States, Agent Widget, Progress Indicator, Brand Logo
- Iteration 21: 100% — Phase 1-4 refactor
- Iterations 16-20: 100%

## 3rd Party Integrations
- OpenAI GPT-5.2 via Emergent LLM Key
- Resend email integration

## Remaining Backlog (Priority Order)

### P0 — Next
- Backend Agent Workspace endpoint (GET /api/agents/workspace with meaningful operational data)
- Agent Behavior UX (agents explain what they're doing, current/next steps, human-readable statuses)

### P1 — Polish
- Simplify language globally (no markdown noise in chat/system responses)
- Improve agent chat tone to be warmer and more actionable

### P2 — Infrastructure
- Resend domain verification for production
- Performance optimization

### P3 — Future
- Country-specific tax rules
- Advanced analytics dashboard
- Multi-language support
- Catalog expansion to 120+ procedures
