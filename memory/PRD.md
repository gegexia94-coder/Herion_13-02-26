# Herion - Controlled Execution Platform for Fiscal/Administrative Operations
## Product Requirements Document

### Original Problem Statement
Build Herion as a premium European operational platform for fiscal and administrative practices, designed as a controlled execution system with strong founder-level governance.

### Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Branding**: Deep Teal #0F4C5C + Emerald #5DD9C1, Manrope font
- **Language**: UI in Italian, codebase in English

### Role Model
1. **Creator** (HERION-CREATOR-001) - Unique protected founder, full visibility
2. **Admin** - Operational management, governance visibility
3. **User** - Practice management, approval, status tracking

### What's Implemented

**Core Platform (Batch 0):**
- [x] JWT Auth (cookie-based), Creator bootstrap (env var only), 12-agent system
- [x] Practice CRUD, Document upload, PDF export, Q&A Chat, Reminders
- [x] Practice Catalog (20+ entries) + Authority Registry (14 entries)

**Batch 1 (Catalog & Visualization):**
- [x] Practice Catalog Page (/catalog), WorkflowStepper, User/Client Identity Card

**Batch 2 (Operational Core):**
- [x] Deadline Dashboard (/deadlines), Submission Center (/submissions)
- [x] Delegation System (lifecycle: not_required→requested→under_review→valid/rejected)
- [x] Readiness Engine + Practice Readiness Panel

**Batch 3 (Governance Layer):**
- [x] Non-Negotiable Rules (10 NNR rules), Permissions Matrix (23 actions x 3 roles)
- [x] Fail-Safe/Emergency Stop, Enhanced Audit Logging, Governance Call Method
- [x] Governance Dashboard (/governance) — admin/creator only

**Batch 4 (Protection & Monitoring):**
- [x] **Alert Center** (/alerts) — Severity-based alerts (info/warning/high/critical), role-based visibility, sections (Alta Priorita, Nuove, Pratiche, Sicurezza, Governance, Risolte), acknowledge/resolve actions
- [x] **Security Monitoring** — Failed login tracking, threshold-based auto-alert generation (3+ failed logins → alert), security events API (admin/creator only)
- [x] **Document Vault** (/vault) — Secure document storage with vault_status, sensitivity_level, verification_status, category metadata. Summary cards, search, category filters, admin verify action
- [x] **Integrated Protection** — Failed logins → security events → auto-alerts. Sensitive document recategorization → security event + alert. All changes tracked in governance audit
- [x] **Enhanced Company Closure Template** — COMPANY_CLOSURE catalog entry with workflow_steps, readiness_criteria, admin_notes, is_template flag

### What's NOT Yet Implemented
- [ ] Herion Guard (boundary enforcement agent, alternative recommendations)
- [ ] Real-Time Follow-Up System (post-submission tracking)
- [ ] Real Email Integration (Resend — user confirmed)
- [ ] Practice template instance creation (Nexus S.r.l. case)
- [ ] Catalog expansion to 120+, country-specific tax rules, 2FA, multi-language

### Key DB Collections
users, practices, practice_timeline, approval_snapshots, practice_catalog, authority_registry, documents, activity_logs, reminders, notifications, practice_chats, submission_records, governance_audit, **alerts** (NEW), **security_events** (NEW)

### Key API Endpoints
- Alerts: GET /api/alerts, GET /api/alerts/summary, PATCH /api/alerts/{id}?action=...
- Security: GET /api/security/events, GET /api/security/summary
- Vault: GET /api/vault, GET /api/vault/summary, PATCH /api/vault/{id}?vault_status=...
- Governance: GET /api/governance/check/{id}, /dashboard, /audit, /permissions
- Submission: GET /api/submission-center, POST /api/practices/{id}/submit
- Delegation: PUT /api/practices/{id}/delegation
- + All previous endpoints (auth, practices, catalog, documents, agents, etc.)

### Creator Security Rules
- Password from CREATOR_PASSWORD env var only (no fallback)
- Creator recognized via: email + role=creator + is_creator=true + creator_uuid

### 3rd Party Integrations
- OpenAI GPT-5.2 via Emergent LLM Key (agent orchestration + Q&A)
- Email: MOCKED (Resend selected, to be integrated later)
