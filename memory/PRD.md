# Herion - Controlled AI-Driven Tax Management Platform

## Product Requirements Document

### Original Problem Statement
Build a transparent, AI-driven tax management web application called "Herion". Must be a controlled execution platform with orchestration of multiple specialized agents, strict user approval before submission, and a structured Practice Catalog and Authority Registry. All UI text in Italian; codebase in English.

### Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (monolith server.py)
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (13 agents incl. Father Agent + Herion Guard)
- **Auth**: JWT cookie-based with protected Creator bootstrap

### Operational Scope
- **Current**: Italy only — all workflows, routing, document logic, and service promises are strictly Italian
- **Future**: Europe-ready architecture, but no active non-Italian support
- **Rule**: Non-Italian cases are blocked, unsupported, or escalated

### Key User Roles
- **Creator**: Reserved bootstrap account with Control Room, full governance powers
- **Admin**: System admin with governance, alerts, vault, document matrix management
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
- Herion Guard (13th agent): 7-dimension boundary enforcement with safe alternatives
- Real-Time Follow-Up System: 5 rules, urgency escalation, auto-resolution
- Nexus S.r.l. practice from COMPANY_CLOSURE template
- Creator password security fix (env-only, never exposed)

#### Italy-Only Cleanup + Document Intelligence (Batch 6 — 2026-04-10)
- **Phase A**: All 20 catalog entries → country_scope=IT, operational_status (active_italy_scope/active_internal). All 15 registry entries → registry_status (active_italy_scope/active_internal/needs_validation). Welcome/Catalog pages → Italy-first positioning. Guard/Governance → country scope enforcement.
- **Phase B**: Full Document Matrix for 10 Italian practice types:
  - COMPANY_CLOSURE: 6 required (2 signed), 3 optional, 2 conditional (delegation P7M, procura speciale), 4 expected outputs
  - VAT_OPEN_PF: 3 required (1 signed), 1 optional, 1 conditional, 2 outputs
  - All other types: complete matrices with formats, sensitivity, signing requirements
- Signature handling: P7M/CAdES awareness, PAdES support, blocking on missing signatures
- Sensitivity levels: standard, personal, fiscal, legal, confidential — with role-based visibility
- Output tracking: receipt, protocol, attestation, dossier per practice type
- Blocking logic: practice stops when document conditions unmet
- Guard integration: document_completeness dimension uses Document Matrix

### Key API Endpoints
- Auth: POST /api/auth/login, /register, /forgot-password, /reset-password
- Practices: GET/POST /api/practices, GET /api/practices/{id}, POST /api/practices/{id}/submit, /approve
- Guard: GET /api/guard/evaluate/{id}, GET /api/guard/summary
- Follow-Up: GET /api/follow-ups, GET /api/follow-ups/summary, PATCH /api/follow-ups/{id}
- Template: POST /api/practices/from-template, GET /api/catalog/templates
- Document Matrix: GET /api/documents/matrix/{id}, GET /api/documents/matrix-types, GET /api/documents/sensitivity-levels
- Governance: GET /api/governance/check/{id}, GET /api/governance/dashboard
- Alerts: GET /api/alerts, GET /api/alerts/summary
- Vault: GET /api/vault, GET /api/vault/summary

### Database Collections
users, practices, practice_timeline, documents, alerts, security_events, governance_audit, practice_catalog, authority_registry, reminders, follow_up_items

### Testing Status
- Iteration 12: 20/20 tests passed (100%)
- All previous iterations: 100% pass rate

### Remaining Backlog
- P1: Real Email Integration (Resend) — requires user API key
- P2: Country-specific tax rules implementation
- P2: 2FA-ready architecture
- P2: Advanced analytics / Creator profit dashboard
- P2: Multi-language support
- P2: Catalog expansion to 120+ procedures
