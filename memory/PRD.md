# Herion - Controlled Execution Platform (AI Practice Manager)

## Original Problem Statement
Build "Herion AI" — a controlled execution platform with orchestration of multiple specialized agents for fiscal and administrative practice management. All UI text in Italian. Codebase in English.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Manrope font
- **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based JWT
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend integration
- **Design System**: CSS custom properties (#FBFBFB, #E8F9FF, #C4D9FF, #C5BAFF)
- **Navigation**: Left collapsible sidebar (Dashboard, Pratiche, Comunicazione)

## What's Been Implemented

### Core Platform
- Multi-agent orchestration (12 specialized agents)
- Practice CRUD with lifecycle management
- Priority Engine (deadlines, risk, stall time)
- Email Center with 34 templates
- Creator Control Room
- Cookie-based JWT authentication

### UI System (Batch 11 — 2026-04-11) — MAJOR REFACTOR
- **Global Design System**: CSS tokens (#FBFBFB, #E8F9FF, #C4D9FF, #C5BAFF), Manrope font, shadow/spacing scale
- **Geometric H Logo**: Custom SVG mark replacing image mascot
- **Left Sidebar Navigation**: Collapsible, 3 items (Dashboard, Pratiche, Comunicazione), user menu
- **Welcome Page**: Hero with HERION watermark, carousel (5 slides), Chi siamo, value props, stats, CTA
- **Dashboard**: Operational control panel — critical alert, quick actions, practice table (Nome/Stato/Azione), reminder carousel, critical practices block, activity log
- **Practice Detail**: 2-column layout. Left (70%): status timeline, collapsible agent pipeline, documents, agent logs. Right (30%): blockers, AI suggestions, chat, timeline, collapsed activity log
- **Practices List**: Clean table with search, filters, delete
- **Login/Register**: Centered minimal forms with geometric H logo
- **Color reduction**: Removed decorative gradients, enforced white/gray + blue + red/yellow for meaning only

### Visual Agent Pipeline System (Batch 10 — 2026-04-11)
- 12-agent horizontal pipeline: Intake → Ledger → Compliance → Documents → Delegate → Deadline → Flow → Routing → Research → Monitor → Advisor → Guard
- Visual states: not_started, in_progress, completed, failed
- Collapsible summary (default compact), expandable full view
- Interactive node popovers with agent output

### Previous Batches (1-9)
- Dashboard KPIs, quick actions, priority sorting
- Navigation reduced to 3 sections
- Toast/Alert spam fixed (inline feedback)
- Backend Priority Engine
- Convenience wrapper endpoints

## Testing Status
- Iteration 18: 100% pass — Full UI refactor verified (all pages, navigation, Italian text, color system)
- Iteration 17: 100% pass — Agent Pipeline verified
- Iteration 16: 100% pass — Operational control center verified

## 3rd Party Integrations
- OpenAI GPT-5.2 — Agent orchestration (Emergent LLM Key)
- Resend — Email sending (API key in backend/.env)

## Remaining Backlog
- P1: Resend domain verification for production sending
- P2: Country-specific tax rules implementation
- P2: Advanced analytics / Creator profit dashboard
- P2: Multi-language support
- P2: Catalog expansion to 120+ procedures
