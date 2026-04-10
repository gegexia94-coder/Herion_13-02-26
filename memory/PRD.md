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

### Design System
- **Archetype**: Swiss & High-Contrast Elevated (Italian Premium Finance)
- **Font**: Manrope
- **Brand Primary**: #0A192F (Deep Navy)
- **Accent Blue**: #3B82F6 (Electric Blue Soft)
- **Accent Palette**: Cyan #06B6D4, Lilla #8B5CF6, Coral #FF6B6B, Amber #F59E0B
- **Background**: #F8F9FA, Surface #FFFFFF, Surface-alt #F1F3F5
- **Navbar**: Logo-only (no text), 5 primary items, "Altro" dropdown for secondary
- **KPIs**: Bento-style (hero card dark, supporting cards white)
- **Dashboard Hero**: Deep navy with monumental "HERION" background text

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

#### Real Email Integration — Resend (Batch 7)
- Resend configured, API key in backend/.env only
- Email Draft/Review/Send flow: draft → review → approved → sent
- Compliance gates, sensitivity blocking, signature awareness
- Timeline + audit events, admin-only send
- Email Center page, password reset via Resend

#### Italian Email Template System (Batch 8)
- 34 professional Italian templates across 9 groups
- Placeholder resolution engine from practice data
- Resolve endpoint, draft-from-template endpoint
- Frontend template UI with group browser, picker, live preview, override inputs
- Manual draft fallback preserved

#### UI Refactor — Product-Grade (Batch 9 — 2026-04-10)
- **Navbar restructured**: Logo icon only, 5 primary nav items (Dashboard, Pratiche, Email, Scadenze, Governance), "Altro" dropdown for 7 secondary items, email live indicator ("Comunicazioni Attive"), user menu
- **Dashboard hero redesigned**: Deep navy hero with monumental "HERION" background text, "Piattaforma Operativa" label, "Flusso Email Live" badge, blue CTA button
- **KPI cards**: Bento-style grid — hero card (navy bg, white text), 3 supporting white cards with accent icons
- **Global palette swap**: #0F4C5C → #0A192F, #5DD9C1 → #3B82F6 across all pages
- **CSS variables updated**: New brand, accent, surface, text, border tokens
- **Visual hierarchy improved**: More spacing, clearer sections, premium feel
- **Follow-up toast bug fixed**: Passive fetch failures no longer trigger global toast

### Key API Endpoints
- Auth: POST /api/auth/login, /register, /forgot-password, /reset-password
- Practices: GET/POST /api/practices, GET /api/practices/{id}, POST /api/practices/{id}/submit, /approve
- Guard: GET /api/guard/evaluate/{id}, GET /api/guard/summary
- Follow-Up: GET /api/follow-ups, GET /api/follow-ups/summary, PATCH /api/follow-ups/{id}
- Template: POST /api/practices/from-template
- Document Matrix: GET /api/documents/matrix/{id}, GET /api/documents/matrix-types, GET /api/documents/sensitivity-levels
- Email: POST /api/emails/draft, GET /api/emails/drafts, POST .../submit-review, .../approve, .../send, GET /api/emails/summary
- Email Templates: GET /api/emails/templates, GET /api/emails/template-groups, POST /api/emails/templates/{id}/resolve, POST /api/emails/draft-from-template
- Governance: GET /api/governance/check/{id}, GET /api/governance/dashboard

### Testing Status
- Iteration 15: 100% pass — UI refactor verified (navbar, dashboard, palette, follow-up fix)
- Iteration 14: 24/24 — Email template system
- All previous: 100%

### 3rd Party Integrations
- OpenAI GPT-5.2 — Agent orchestration (Emergent LLM Key)
- Resend — Real email sending (API key in backend/.env)

### Remaining Backlog
- P1: Resend domain verification for production sending
- P2: Country-specific tax rules implementation
- P2: 2FA-ready architecture
- P2: Advanced analytics / Creator profit dashboard
- P2: Multi-language support
- P2: Catalog expansion to 120+ procedures
- P2: Full attachment binary sending via Resend
