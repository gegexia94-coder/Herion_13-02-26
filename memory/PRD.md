# Herion - Controlled Execution Platform for Fiscal/Administrative Operations
## Product Requirements Document

### Original Problem Statement
Build Herion as a premium European operational platform for fiscal and administrative practices, designed as a controlled execution system with strong founder-level governance. The platform must feel private, professional, controlled, structured, premium, and trustworthy.

### Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Branding**: Deep Teal #0F4C5C + Emerald #5DD9C1, Manrope font
- **Language**: UI in Italian, codebase in English

### Role Model
1. **Creator** (Gege-Xia, HERION-CREATOR-001) - Unique protected founder, full visibility, Creator Control Room
2. **Admin** - Operational management, workflow handling, governance visibility
3. **User** - Simplified practice management, approval, status tracking

### Agent Architecture (12 Total)
Father Agent (Supreme Orchestrator) coordinates 11 specialists:
Intake, Ledger, Compliance, Documents, Delegate, Deadline, Flow, Routing, Research, Monitor, Advisor

### Practice Lifecycle
draft -> data_collection -> in_progress -> waiting_approval -> approved -> submitted -> completed
Also: blocked, escalated, rejected, failed_submission

### What's Implemented

**Core Platform (Batch 0):**
- [x] Public Welcome/Landing page with warm Italian copy
- [x] JWT Auth with role-based access (cookie-based)
- [x] Protected Creator bootstrap (password via env var only)
- [x] Creator Control Room + role separation
- [x] 12-agent orchestrated system with approval gate
- [x] Practice CRUD, Document upload, PDF export, Q&A Chat, Reminders
- [x] Profile/Settings page + extended registration
- [x] Practice Catalog (20 entries) + Authority Registry (14 entries)

**Batch 1 (Catalog & Visualization):**
- [x] Practice Catalog Page (/catalog) with search, filters, expandable cards
- [x] Step-by-step Practice State Visualization (WorkflowStepper)
- [x] User/Client Identity Card on Practice Detail
- [x] Personal Dashboard Greeting

**Batch 2 (Operational Core):**
- [x] Deadline Dashboard (/deadlines) with urgency tracking
- [x] Submission Center (/submissions) with readiness checks, submit capability
- [x] Delegation System — lifecycle: not_required → requested → under_review → valid/rejected
- [x] Readiness Engine — checks documents, delegation, approval, routing, support level
- [x] Practice Readiness Panel on Practice Detail with delegation actions

**Batch 3 (Governance Layer):**
- [x] **Non-Negotiable Rules** — 10 rules (NNR-001 to NNR-010) that define absolute boundaries
- [x] **Permissions Matrix** — 23 actions × 3 roles (user/admin/creator) with clear allow/deny
- [x] **Fail-Safe / Emergency Stop** — 10 triggers, stop levels (info/warning/high/critical), automatic freeze
- [x] **Enhanced Audit Logging** — governance_audit collection with full traceability: actor, action, target, severity, previous/new state, reason
- [x] **Governance Call Method** — Unified pre-action check combining rules + permissions + fail-safe + audit. Integrated into submission and approval flows
- [x] **Governance Dashboard** (/governance) — 4 tabs: Panoramica, Registro Audit, Regole, Permessi. Admin/Creator only
- [x] **Role-based nav visibility** — Governance link hidden from regular users

### What's NOT Yet Implemented
- [ ] Herion Guard (boundary enforcement, alternative recommendations)
- [ ] Document Vault / Custody (secure storage, placement, visibility)
- [ ] Real-Time Follow-Up System (post-submission tracking)
- [ ] Alert Center (prioritized alerts, severity levels)
- [ ] Security Monitoring (defensive suspicious behavior detection)
- [ ] Real Email Provider Integration (Resend — user preference)
- [ ] Catalog expansion to 120+, country-specific tax rules, 2FA, multi-language

### Key DB Collections
- users, practices, practice_timeline, approval_snapshots
- practice_catalog, authority_registry
- documents, activity_logs, reminders, notifications, practice_chats
- submission_records, governance_audit (NEW)

### Key API Endpoints
- Auth: POST /api/auth/login, /register, GET /api/auth/me
- Practices: GET/POST /api/practices, GET/PUT/DELETE /api/practices/{id}
- Catalog: GET /api/catalog, /api/registry
- Delegation: PUT /api/practices/{id}/delegation
- Readiness: GET /api/practices/{id}/readiness
- Submission: GET /api/submission-center, POST /api/practices/{id}/submit
- Deadlines: GET /api/deadlines
- Governance: GET /api/governance/check/{id}, /dashboard, /audit, /audit/{id}, /permissions
- Documents: POST /api/documents/upload/{id}
- Agents: POST /api/agents/execute, /api/agents/orchestrate

### Creator Security Rules
- Password from CREATOR_PASSWORD env var only (no fallback)
- Bootstrap fails safely if missing
- Creator recognized via: email + role=creator + is_creator=true + creator_uuid

### 3rd Party Integrations
- OpenAI GPT-5.2 via Emergent LLM Key (agent orchestration + Q&A)
- Email: MOCKED (Resend selected by user, to be integrated later)
