# Herion - Controlled Execution Platform (AI Practice Manager)

## Original Problem Statement
Build "Herion AI" — a controlled execution platform acting as a digital accountant (commercialista digitale) for fiscal and administrative practice management. All UI in Italian, code in English.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based JWT
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend integration
- **Brand**: Geometric H SVG logo, teal #0ABFCF

## Core Principle
Herion acts like a real accountant: prepares, verifies, guides. Clearly separates Herion actions, user actions, delegated actions, and external entity actions.

## What's Been Implemented

### Workspace + Delegation + Official Action System (Batch 17 — 2026-04-11)
- **GET /api/practices/{id}/workspace**: Real source of truth endpoint returning current_agent, current_activity, completed_activities, next_activity, blockers, documents_summary, delegation, official_action, proof_layer, approval with father_review, timeline_summary, ui_guidance
- **Father Agent Review**: During approval, Father agent becomes active supervisor with compatibility_check, requirements_check, document_received_check, entity_validation_check, estimated timing, approval_recommendation, path/goal/timing summaries
- **Delegation System**: POST /delegate (grant with level: assist/partial/full, scope, entity_scope), POST /revoke-delegation, audit trail in delegation_audit collection
- **Official Action Model**: Each practice exposes entity_name, action_label, submission_channel, credentials_required, can_herion_prepare, can_herion_submit, requires_user_direct_step
- **Proof/Receipt Layer**: POST /proof (protocol_number, receipt_pdf, etc.), proof status tracking (missing/pending/received/verified)
- **Official Step Completion**: POST /complete-official-step with outcome tracking and audit
- **UI Guidance**: Every state generates headline + subheadline + next_step for frontend
- **Human-Readable Labels**: All workspace data uses Italian labels, not technical codes

### Language + Agent Behavior (Batch 16)
- Commercialista digitale positioning, Herion/Tu labels, messaging labels, updated chat/admin prompts

### Empty States, Widget, Progress, Brand (Batch 15)
- Guided empty states, agent widget, 6-dot progress, geometric H logo

### Phase 1-4 Refactor (Batch 14)
- Understanding gate, 6-step flow, document clarity, status semantics, channel layer

### Earlier (Batches 1-13)
- Priority system, auth, catalog, governance, email, etc.

## Testing Status
- Iteration 24: 100% (19/19) — Workspace + Delegation + Official Action
- Iteration 23: 100% — Language + Agent Behavior
- Iteration 22: 100% — Empty States, Widget, Progress, Logo
- Iteration 21: 100% — Phase 1-4 refactor

## Key API Endpoints (New)
- GET /api/practices/{id}/workspace — Full practice workspace
- POST /api/practices/{id}/delegate — Grant delegation
- POST /api/practices/{id}/revoke-delegation — Revoke delegation
- POST /api/practices/{id}/proof — Upload receipt/proof
- POST /api/practices/{id}/complete-official-step — Mark official step done

## Remaining Backlog

### P0 — Frontend Integration
- Build "Official Step" UI component in PracticeDetailPage using workspace data
- Wire practice detail to workspace endpoint for real-time agent/activity display
- Add delegation UI (grant/revoke controls)

### P1 — Notifications
- Structured notifications: documents_missing, signature_required, ready_for_submission, official_step_required, receipt_upload_required, waiting_external_response

### P2 — Future
- Embedded SPID/CIE auth flow (modal/redirect)
- Advanced analytics
- Multi-language, catalog expansion
