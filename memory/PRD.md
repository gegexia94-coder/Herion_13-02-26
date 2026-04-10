# Herion - Controlled AI-Driven Tax Management Platform

## Product Requirements Document

### Original Problem Statement
Build a transparent, AI-driven tax management web application called "Herion". Must be a controlled execution platform with orchestration of multiple specialized agents, strict user approval before submission, and a structured Practice Catalog and Authority Registry. All UI text in Italian; codebase in English.

### Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (monolith server.py)
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (13 agents including Father Agent)
- **Auth**: JWT cookie-based with protected Creator bootstrap

### Key User Roles
- **Creator**: Reserved bootstrap account with Control Room (`/creator`), full governance powers
- **Admin**: System admin with governance, alerts, vault management
- **User**: Standard client, can create and manage own practices

### Implemented Features (Completed)

#### Batch 0 — Foundation
- JWT auth with registration, login, logout, password reset
- Creator bootstrap from environment (email + password from .env)
- Practice CRUD with status management
- 12-agent AI orchestration (intake, ledger, compliance, documents, delegate, deadline, flow, routing, research, monitor, advisor, guard)
- Agent chat and single/full orchestration
- Role-based access control

#### Batch 1 — Practice Catalog & Workflow
- Practice Catalog page (`/catalog`) with Italian tax procedures
- Step-by-step workflow stepper visualization
- Practice state machine (draft → in_progress → waiting_approval → approved → submitted → completed)

#### Batch 2 — Submission & Deadlines
- Submission Center (`/submissions`)
- Deadline Dashboard (`/deadlines`)
- Delegation system with UI and backend engine

#### Batch 3 — Governance & Security
- Governance Dashboard (`/governance`) with Non-Negotiable Rules, Permissions Matrix, Fail-Safe
- Audit logging system with severity levels
- Governance Call — unified check method before important actions

#### Batch 4 — Alerts & Vault
- Alert Center (`/alerts`) with filtering and severity
- Security monitoring engine
- Document Vault (`/vault`) with metadata tracking and visibility controls

#### Batch 5 — Guard, Follow-Up, Template Instance (2026-04-10)
- **Herion Guard**: 13th agent — boundary-enforcement engine evaluating 7 dimensions (readiness, support, routing, delegation, approval, risk, documents). Verdicts: Autorizzato / Sorvegliato / Bloccato. Always provides safe alternative recommendations. Integrated into governance_call() and submit flow. UI panel on practice detail.
- **Real-Time Follow-Up System**: Post-transition event tracking. 5 follow-up rules (submitted_no_receipt, approved_not_submitted, delegation_pending_verification, orchestration_awaiting_approval, stagnant_in_progress). Urgency escalation: pending → overdue → critical. Auto-resolution when practice progresses. API + UI page at `/follow-ups` with summary, filters, resolve buttons.
- **Nexus S.r.l. Practice Instance**: Demo practice seeded from COMPANY_CLOSURE template. Full template-to-instance flow via `POST /api/practices/from-template`. Authority Registry entry for CCIAA (Camera di Commercio) added.
- **Creator Security Fix**: Creator password removed from all public files and summaries. Stored exclusively in backend `.env`. test_credentials.md shows "PROTECTED".

### Key API Endpoints
- Auth: POST /api/auth/login, /register, /forgot-password, /reset-password, /change-password
- Practices: GET/POST /api/practices, GET /api/practices/{id}, POST /api/practices/{id}/submit, /approve
- Guard: GET /api/guard/evaluate/{id}, GET /api/guard/summary
- Follow-Up: GET /api/follow-ups, GET /api/follow-ups/summary, PATCH /api/follow-ups/{id}
- Template: POST /api/practices/from-template, GET /api/catalog/templates
- Governance: GET /api/governance/check/{id}, GET /api/governance/dashboard
- Alerts: GET /api/alerts, GET /api/alerts/summary
- Vault: GET /api/vault, GET /api/vault/summary
- Orchestration: POST /api/practices/{id}/orchestrate, POST /api/practices/{id}/agent/{name}

### Database Collections
- users, practices, practice_timeline, documents, alerts, security_events
- governance_audit, practice_catalog, authority_registry, reminders
- follow_up_items (NEW — Batch 5)

### 3rd Party Integrations
- OpenAI GPT-5.2 — Agent orchestration (Emergent LLM Key)
- Resend — Email (PLANNED, not yet integrated)

### Testing Status
- Iteration 11: 14/14 tests passed (100%) — Batch 5 complete
- All previous iterations (7-10): 100% pass rate

### Remaining Backlog
- P1: Real Email Integration (Resend) — requires user API key
- P2: Country-specific tax rules implementation
- P2: 2FA-ready architecture
- P2: Advanced analytics / Creator profit dashboard
- P2: Multi-language support
- P2: Catalog expansion to 120+ procedures
