# Herion - Controlled AI-Driven Tax Management Platform

## Product Requirements Document

### Original Problem Statement
Build a transparent, AI-driven tax management web application called "Herion". Must be a controlled execution platform with orchestration of multiple specialized agents, strict user approval before submission, and a structured Practice Catalog and Authority Registry. All UI text in Italian; codebase in English.

### Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (monolith server.py)
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (12 specialist agents + Father/Guard)
- **Auth**: JWT cookie-based with protected Creator bootstrap
- **Email**: Resend (real, not mocked)

### Design System
- **Brand**: Herion mascot (blue robot with clipboard) at `/public/herion-mascot.png`
- **Palette**: Deep Navy #0A192F, Electric Blue #3B82F6, Amber #F59E0B, Coral #EF4444, Emerald #10B981
- **Surfaces**: #F8F9FA bg, #FFFFFF cards, #E2E8F0 borders
- **Navbar**: 3 sections only — Dashboard, Pratiche, Comunicazione
- **Font**: Manrope

### Key User Roles
- **Creator**: Reserved bootstrap account with Control Room, full governance powers
- **Admin**: System admin with governance, alerts, vault, email approval
- **User**: Standard client for Italian fiscal practices

### Implemented Features

#### Foundation (Batches 0-6)
- JWT auth, Creator bootstrap, Practice CRUD, 13-agent orchestration, role-based access
- Practice Catalog, workflow stepper, Submission Center, Deadline Dashboard, Delegation
- Governance Dashboard, Non-Negotiable Rules, Permissions Matrix, Fail-Safe, Audit log
- Alert Center, Security monitoring, Document Vault with metadata
- Herion Guard (7-dimension boundary enforcement)
- Real-Time Follow-Up System
- Italy-Only Scope + Document Intelligence Matrix

#### Real Email Integration — Resend (Batch 7)
- Draft/Review/Send flow with compliance gates
- Sensitivity blocking, signature awareness
- Timeline + audit events, admin-only send

#### Italian Email Template System (Batch 8)
- 34 templates across 9 groups with placeholder resolution
- Live preview, override inputs, draft-from-template

#### UI Refactor — Operational Control Center (Batch 9 — 2026-04-10)
- **Navigation reduced to 3 sections**: Dashboard, Pratiche, Comunicazione
- **Herion mascot brand**: Logo in navbar from uploaded image
- **Toast spam eliminated**: Passive fetch errors silenced (console.warn), toasts only for user actions
- **Dashboard as control center**:
  - A. KPI cards: Pratiche Attive, Attesa Approvazione (highlighted), Completate, Urgenti
  - B. Quick Actions: Nuova Pratica + Comunicazione buttons
  - C. Practice Table: 10 recent practices with status/priority/risk badges + Esegui/Approva buttons
  - D. Critical Block: Practices needing attention (waiting_approval, blocked, escalated)
  - E. Activity Log: Recent system events with timestamps
- **Priority Engine**: Backend `evaluate_practice_priority()` auto-calculates priority from status/risk/deadline/stale
- **Run Workflow endpoint**: `POST /api/practices/{id}/run` convenience wrapper
- **Status Visual System**: Badges for all states (draft, processing, waiting_approval, completed, failed, blocked, escalated)
- **Priority badges**: Urgente (red), Alta (amber) shown inline on practice rows

### Key API Endpoints
- Auth: POST /api/auth/login, /register, /forgot-password, /reset-password
- Practices: GET/POST /api/practices, GET /api/practices/{id}, POST .../run, .../approve, .../submit
- Dashboard: GET /api/dashboard/stats (returns KPIs, recent, critical, activity_logs)
- Guard: GET /api/guard/evaluate/{id}
- Email: POST /api/emails/draft, GET /api/emails/drafts, .../submit-review, .../approve, .../send
- Email Templates: GET /api/emails/templates, POST .../resolve, POST /api/emails/draft-from-template
- Governance, Alerts, Vault, Follow-ups, Activity logs — unchanged

#### Visual Agent Pipeline System (Batch 10 — 2026-04-11)
- **AgentPipeline component** (`/app/frontend/src/components/AgentPipeline.jsx`)
  - Horizontal pipeline displaying all 12 backend agents: Intake → Ledger → Compliance → Documents → Delegate → Deadline → Flow → Routing → Research → Monitor → Advisor → Guard
  - Visual states per agent: not_started (gray), in_progress (blue pulse), completed (green checkmark), failed (red X), waiting_approval (amber)
  - Connector lines between nodes change color based on previous agent state
  - Progress bar with completion percentage
  - Interactive node popovers showing agent output data on click
  - "Avvia Pipeline" / "Riesegui Pipeline" button for running workflow
  - "Approva Pratica" button when practice status is waiting_approval
- Integrated into PracticeDetailPage above the existing WorkflowStepper

### Testing Status
- Iteration 17: 100% pass — Visual Agent Pipeline verified (all states, buttons, popovers, Italian text)
- Iteration 16: 100% pass — Operational control center verified
- All previous iterations: 100%

### 3rd Party Integrations
- OpenAI GPT-5.2 — Agent orchestration (Emergent LLM Key)
- Resend — Real email sending (API key in backend/.env)

### Remaining Backlog
- P1: Resend domain verification for production sending
- P2: Country-specific tax rules implementation
- P2: Advanced analytics / Creator profit dashboard
- P2: Multi-language support
- P2: Catalog expansion to 120+ procedures
