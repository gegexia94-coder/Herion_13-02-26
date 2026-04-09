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
**Father Agent** (Supreme Orchestrator) coordinates:
1. Herion Intake (Step 1) - Case understanding/classification
2. Herion Ledger (Step 2) - Financial/accounting data
3. Herion Compliance (Step 3) - Regulatory compliance
4. Herion Documents (Step 4) - Document preparation/verification
5. Herion Delegate (Step 5) - Delegation/authorization
6. Herion Deadline (Step 6) - Deadline/timing monitoring
7. Herion Flow (Step 7) - Workflow progression
8. Herion Routing (Step 8) - Channel/destination selection
9. Herion Research (Step 9) - Official source research/verification
10. Herion Monitor (Step 10) - Status tracking/reminders
11. Herion Advisor (Step 11) - Final user explanation

### Practice Lifecycle
draft -> data_collection -> in_progress -> waiting_approval -> approved -> submitted -> completed
Also: blocked, escalated, rejected

### What's Implemented (as of Feb 2026)
- [x] Public Welcome/Landing page with warm Italian copy
- [x] Protected Creator bootstrap (gegexia94@gmail.com)
- [x] Creator Control Room with system overview
- [x] Creator vs Admin vs User role separation
- [x] JWT Auth with role-based access
- [x] 12-agent system (Father + 11 specialists)
- [x] Controlled execution with approval gate
- [x] Approval snapshot persistence
- [x] Practice timeline/audit trail
- [x] Risk assessment and delegation evaluation
- [x] Practice Catalog (20 real entries: basic + medium Italian fiscal cases)
- [x] Authority Registry (14 entries with real Italian authority URLs)
- [x] Practice CRUD with EU country support
- [x] Document upload with categories
- [x] PDF export
- [x] Practice Q&A Chat
- [x] Smart Reminders Banner
- [x] Profile/Settings page with password change
- [x] Extended registration (EU, client types)
- [x] Mock password reset flow

### What's NOT Yet Implemented
- [ ] Real email provider integration
- [ ] Email templates and sending
- [ ] Submission Center
- [ ] Deadline Dashboard (operational command center)
- [ ] Document Matrix per practice
- [ ] Step-by-step practice state visualization
- [ ] Father Agent autonomous recovery logic
- [ ] Herion Update agent (change monitoring)
- [ ] Creator strategic notifications + email alerts
- [ ] Alert system (inactivity, suspicious behavior)
- [ ] Catalog expansion to 120+ practices
- [ ] Creator profit/growth dashboard
- [ ] User-facing Practice Catalog page
- [ ] 2FA, multi-language, advanced analytics

### Key DB Collections
- users: {email, password_hash, role, is_creator, creator_uuid, ...}
- practices: {user_id, type, status, orchestration_result, risk_level, delegation_status, ...}
- practice_timeline: {practice_id, event_type, event_label, timestamp, details}
- approval_snapshots: {practice_id, user_id, summary_shown, risk_level, data_used, ...}
- practice_catalog: {practice_id, name, risk_level, support_level, expected_channel, ...}
- authority_registry: {registry_id, name, destination_type, country, portal_url, ...}
- activity_logs, documents, reminders, notifications, practice_chats

### 3rd Party Integrations
- OpenAI GPT-5.2 via Emergent LLM Key (for agent orchestration + Q&A)
