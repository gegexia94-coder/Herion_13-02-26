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

### Automatic Intelligent Priority System (Batch 12 — 2026-04-11)
- **Backend `evaluate_practice_priority()`**: Computes priority from deadline proximity, status, risk level, stall time
  - Deadline passed → urgent
  - waiting_approval + high risk → urgent
  - waiting_approval + medium risk → high
  - failed/blocked/escalated → high or urgent
  - Stale (>5 days no update, active) → high
  - completed/submitted → low
  - Default → normal
- **`refresh_practice_priority()`**: Persists computed priority per practice
- **`refresh_all_priorities()`**: Bulk refresh on startup for all active practices
- Priority recalculated on: create, status change, approval, orchestration
- Priority sorted in all API responses (urgent first, then high, normal, low)
- **Frontend Dashboard Smart Sections**:
  - "Urgente Ora" — red alert section for urgent practices
  - "In Attesa di Approvazione" — amber section for approval-needed practices
  - "Tutte le Pratiche" — table with PRIORITA column, colored badges
- **Priority badges** on Dashboard, Practices List, Practice Detail header
- **Colors**: urgent=red, high=amber, normal=blue, low=gray

### UI System Refactor (Batch 11 — 2026-04-11)
- Global Design System with CSS tokens, Manrope font
- Geometric H Logo (SVG), Left Collapsible Sidebar
- Welcome Page (hero carousel, chi siamo, CTA)
- Dashboard as operational control panel
- Practice Detail 2-column layout
- Login/Register simplified forms

### Visual Agent Pipeline System (Batch 10 — 2026-04-11)
- 12-agent collapsible pipeline with visual states
- Interactive node popovers

### Previous Batches (1-9)
- Dashboard KPIs, quick actions, priority sorting
- Navigation reduced to 3 sections
- Toast/Alert spam fixed
- Backend Priority Engine
- Convenience wrapper endpoints

## Testing Status
- Iteration 19: 100% pass — Priority system verified (backend 9/9 + frontend all)
- Iteration 18: 100% pass — Full UI refactor
- Iteration 17: 100% pass — Agent Pipeline
- Iteration 16: 100% pass — Operational control center

## 3rd Party Integrations
- OpenAI GPT-5.2 — Agent orchestration (Emergent LLM Key)
- Resend — Email sending (API key in backend/.env)

## Remaining Backlog
- P1: Resend domain verification for production sending
- P2: Country-specific tax rules implementation
- P2: Advanced analytics / Creator profit dashboard
- P2: Multi-language support
- P2: Catalog expansion to 120+ procedures
