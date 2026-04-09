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
1. **Creator** (Gege-Xia, HERION-CREATOR-001) - Unique protected founder account, full visibility, Creator Control Room
2. **Admin** - Operational management, workflow handling, system prompts visible
3. **User** - Simplified practice management, approval, status tracking

### Agent Architecture (12 Total)
Father Agent (Supreme Orchestrator) coordinates 11 specialists:
Intake, Ledger, Compliance, Documents, Delegate, Deadline, Flow, Routing, Research, Monitor, Advisor

### Practice Lifecycle
draft -> data_collection -> in_progress -> waiting_approval -> approved -> submitted -> completed
Also: blocked, escalated, rejected, failed_submission

### What's Implemented (as of Feb 2026)

**Core Platform:**
- [x] Public Welcome/Landing page with warm Italian copy
- [x] JWT Auth with role-based access (cookie-based)
- [x] Protected Creator bootstrap (password via env var only, no hardcoded fallback)
- [x] Creator Control Room + Creator vs Admin vs User role separation
- [x] 12-agent orchestrated system
- [x] Controlled execution with approval gate + approval snapshot persistence
- [x] Practice timeline/audit trail
- [x] Practice CRUD with EU country support
- [x] Document upload with categories
- [x] PDF export, Practice Q&A Chat, Smart Reminders
- [x] Profile/Settings page + extended registration
- [x] Practice Catalog (20 entries) + Authority Registry (14 entries)

**Batch 1 (Catalog & Visualization):**
- [x] User-facing Practice Catalog Page (/catalog) with search, filters, expandable detail cards
- [x] Step-by-step Practice State Visualization (WorkflowStepper) on Practice Detail
- [x] User/Client Identity Card on Practice Detail
- [x] Personal Dashboard Greeting

**Batch 2 (Operational Core):**
- [x] **Deadline Dashboard** (/deadlines) — "Centro Operativo" with urgency tracking, sections: Overdue, Blocked, Escalated, Pending Approvals, Waiting Delegation, In Progress, Upcoming Actions
- [x] **Submission Center** (/submissions) — "Centro Invii" with readiness checks, filter tabs, submit capability, blocker visibility
- [x] **Delegation System** — Full lifecycle: not_required → requested → under_review → valid/rejected/expired. Actions: request, upload_confirm, verify, reject, reset
- [x] **Readiness Engine** — Calculates submission readiness checking: documents, delegation, approval, routing, support level. Returns blockers + missing items
- [x] **Practice Readiness Panel** on Practice Detail — Shows delegation status, approval status, document count, routing/channel, action buttons
- [x] **Role-based access** for all practice endpoints (admin/creator can see all users' practices)
- [x] **Submit API** with pre-flight readiness checks + auto-complete for preparation-only practices

### What's NOT Yet Implemented
- [ ] Governance Layer (non-negotiable rules, permissions matrix, fail-safe, governance call)
- [ ] Audit Log Enhancement (complete traceability)
- [ ] Herion Guard (boundary enforcement, alternative recommendations)
- [ ] Document Vault / Custody (secure storage, placement rules, visibility control)
- [ ] Real-Time Follow-Up System (post-submission tracking)
- [ ] Alert Center (prioritized alerts, severity levels)
- [ ] Security Monitoring (defensive suspicious behavior detection)
- [ ] Real Email Provider Integration (Resend — user preference confirmed)
- [ ] Catalog expansion to 120+, country-specific tax rules, 2FA, multi-language, analytics

### Key DB Collections
- users, practices, practice_timeline, approval_snapshots
- practice_catalog, authority_registry
- documents, activity_logs, reminders, notifications, practice_chats
- submission_records (NEW)

### Creator Security Rules
- Password comes ONLY from CREATOR_PASSWORD env var (no fallback)
- Bootstrap fails safely if env var missing
- Creator recognized via: email + role=creator + is_creator=true + creator_uuid

### Key API Endpoints
- Auth: POST /api/auth/login, /register, /forgot-password, /reset-password, GET /api/auth/me
- Practices: GET/POST /api/practices, GET/PUT/DELETE /api/practices/{id}
- Catalog: GET /api/catalog, /api/registry
- Delegation: PUT /api/practices/{id}/delegation
- Readiness: GET /api/practices/{id}/readiness
- Submission: GET /api/submission-center, POST /api/practices/{id}/submit
- Deadlines: GET /api/deadlines
- Documents: POST /api/documents/upload/{id}, GET /api/documents/practice/{id}
- Agents: POST /api/agents/execute, /api/agents/orchestrate
- Timeline: GET /api/practices/{id}/timeline

### 3rd Party Integrations
- OpenAI GPT-5.2 via Emergent LLM Key (agent orchestration + Q&A)
- Email: MOCKED (Resend selected by user, to be integrated in Batch 5)
