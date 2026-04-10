# Herion - Controlled AI-Driven Tax Management Platform

## Product Requirements Document

### Original Problem Statement
Build a transparent, AI-driven tax management web application called "Herion". Must be a controlled execution platform with orchestration of multiple specialized agents, strict user approval before submission, and a structured Practice Catalog and Authority Registry. All UI text in Italian; codebase in English.

### Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (monolith server.py)
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (13 agents incl. Father + Guard)
- **Auth**: JWT cookie-based with protected Creator bootstrap
- **Email**: Resend (real, not mocked)

### Operational Scope
- **Current**: Italy only — all workflows, routing, document logic, and service promises are strictly Italian
- **Future**: Europe-ready architecture, but no active non-Italian support

### Key User Roles
- **Creator**: Reserved bootstrap account with Control Room, full governance powers
- **Admin**: System admin with governance, alerts, vault, email approval
- **User**: Standard client for Italian fiscal practices

### Implemented Features

#### Foundation (Batch 0)
- JWT auth, Creator bootstrap, Practice CRUD, 13-agent orchestration, role-based access

#### Practice Catalog & Workflow (Batch 1)
- Practice Catalog with Italian tax procedures, workflow stepper visualization

#### Submission & Deadlines (Batch 2)
- Submission Center, Deadline Dashboard, Delegation system

#### Governance & Security (Batch 3)
- Governance Dashboard, Non-Negotiable Rules, Permissions Matrix, Fail-Safe, Audit log

#### Alerts & Vault (Batch 4)
- Alert Center, Security monitoring, Document Vault with metadata

#### Guard, Follow-Up, Nexus (Batch 5)
- Herion Guard: 7-dimension boundary enforcement with safe alternatives
- Real-Time Follow-Up System: 5 rules, urgency escalation, auto-resolution
- Nexus S.r.l. practice from COMPANY_CLOSURE template

#### Italy-Only Cleanup + Document Intelligence (Batch 6)
- All catalog/registry entries → Italy scope, operational_status
- Full Document Matrix for 10 Italian practice types
- Signature handling (P7M/CAdES, PAdES)
- Sensitivity levels with role-based visibility
- Output tracking, blocking logic

#### Real Email Integration — Resend (Batch 7 — 2026-04-10)
- **Resend configured** — API key in backend/.env only, never exposed
- **Email Draft/Review/Send flow**: draft → review → approved → sent (or blocked/failed)
- **Compliance gates**: 3 checks before any send — attachment existence, sensitivity rules, signature requirements
- **Sensitivity blocking**: legal/confidential documents cannot be attached to emails
- **Signature awareness**: unsigned docs that require P7M/PAdES are flagged and blocked
- **Timeline events**: email_draft_created, email_submitted_review, email_approved, email_sent
- **Audit events**: all email actions logged in governance audit
- **Admin-only send**: only admin/creator can approve and send
- **Email Center page** (`/email-center`): summary, filters, draft list, create form
- **Password reset**: now uses Resend (real emails, not mock)
- **Resend test mode**: emails only reach verified addresses; production domain verification needed for arbitrary recipients

#### Italian Email Template System (Batch 8 — 2026-04-10)
- **34 professional Italian templates** across 9 groups:
  - Privati (5): missing docs, status update, reminder, blocked, dossier delivery
  - Liberi Professionisti (5): VAT docs, F24, approval request, blocked, delivery
  - Aziende (5): status update, delegation required, signed doc required, blocked, dossier
  - Pratiche Bloccate (6): missing doc, delegation, approval, routing, signature, sensitive attachment
  - Flusso Approvazione (3): requested, reminder, confirmed
  - Flusso Delega (4): requested, under review, rejected, valid
  - Consegna Finale (3): dossier ready, PDF report, package sent
  - Promemoria (1): generic reminder
  - Account e Sicurezza (2): password reset, security notice
- **Placeholder resolution engine**: auto-populates from practice data (name, code, status, document matrix, blockers, links)
- **Resolve endpoint** (`POST /api/emails/templates/{id}/resolve`): returns resolved subject + body + unresolved list
- **Draft-from-template** (`POST /api/emails/draft-from-template`): one-step template → draft creation with compliance checks
- **Frontend template UI**: tab switcher (Da Template / Manuale), group browser, template picker, practice selector, live HTML preview, unresolved placeholder overrides, and "Crea Bozza da Template" button
- **Manual draft fallback**: original manual draft form preserved as "Manuale" tab
- **Full integration**: template drafts follow same draft → review → approve → send flow with compliance, timeline, audit

### Key API Endpoints
- Auth: POST /api/auth/login, /register, /forgot-password, /reset-password
- Practices: GET/POST /api/practices, GET /api/practices/{id}, POST /api/practices/{id}/submit, /approve
- Guard: GET /api/guard/evaluate/{id}, GET /api/guard/summary
- Follow-Up: GET /api/follow-ups, GET /api/follow-ups/summary, PATCH /api/follow-ups/{id}
- Template: POST /api/practices/from-template
- Document Matrix: GET /api/documents/matrix/{id}, GET /api/documents/matrix-types, GET /api/documents/sensitivity-levels
- Email: POST /api/emails/draft, GET /api/emails/drafts, GET/PUT /api/emails/drafts/{id}, POST .../submit-review, .../approve, .../send, GET /api/emails/summary
- Email Templates: GET /api/emails/templates, GET /api/emails/template-groups, GET /api/emails/templates/{id}, POST /api/emails/templates/{id}/resolve, POST /api/emails/draft-from-template
- Governance: GET /api/governance/check/{id}, GET /api/governance/dashboard
- Alerts, Vault, Catalog, Registry — unchanged

### Testing Status
- Iteration 14: 24/24 tests passed (100%) — Email Template System complete
- All previous iterations: 100% pass rate

### 3rd Party Integrations
- OpenAI GPT-5.2 — Agent orchestration (Emergent LLM Key)
- Resend — Real email sending (API key in backend/.env)

### Remaining Backlog
- P1: Resend domain verification for production sending to arbitrary recipients
- P2: Country-specific tax rules implementation
- P2: 2FA-ready architecture
- P2: Advanced analytics / Creator profit dashboard
- P2: Multi-language support
- P2: Catalog expansion to 120+ procedures
- P2: Full attachment binary sending via Resend (currently reference-based)
