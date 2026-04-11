# Herion - Controlled Execution Platform (AI Practice Manager)

## Original Problem Statement
Build "Herion AI" — a digital accountant (commercialista digitale) platform with orchestration of agents for fiscal/administrative practice management. All UI in Italian, code in English.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based JWT
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend integration
- **Brand**: Geometric H SVG logo, teal #0ABFCF

## What's Been Implemented

### Frontend Workspace Integration (Batch 18 — 2026-04-11)
- **PracticeDetailPage rewired to workspace endpoint** as the main source of truth
- **Official Step Card**: Shows entity name, action label, submission channel, who acts (Tu/Herion/Delegated), credentials required, portal URL, proof/receipt status, security note
- **Delegation UI**: Grant (3 levels: assist/partial/full) and revoke controls, scope labels, tracking note, revocable anytime
- **Father Review Block**: During approval, shows compatibility_check, requirements_check, document_check, entity_check, approval_recommendation, estimated timing, path/goal/timing summaries
- **Current Agent Card**: Right column shows active agent name, title, message, status
- **Workspace-driven Guidance**: Labels like "Richiede la tua azione", "Herion sta lavorando" from workspace data
- **Blockers section**: Severity-based cards (red=high, amber=medium)
- **Timeline**: Color-coded events from workspace.timeline_summary

### Backend Workspace + Delegation (Batch 17)
- GET /api/practices/{id}/workspace, POST /delegate, /revoke-delegation, /proof, /complete-official-step

### Language + Agent Behavior (Batch 16)
- Commercialista digitale positioning, Herion/Tu labels, messaging labels

### Empty States, Widget, Progress, Brand (Batch 15)
- Guided empty states, agent widget, 6-dot progress, geometric H logo

### Phase 1-4 Refactor (Batch 14)
- Understanding gate, 6-step flow, document clarity, status semantics, channel layer

### Earlier (Batches 1-13)
- Priority system, auth, catalog, governance, email, etc.

## Testing Status
- Iteration 25: 100% (16/16) — Frontend Workspace Integration
- Iteration 24: 100% (19/19) — Backend Workspace + Delegation
- Iteration 23: 100% — Language + Agent Behavior
- Iteration 22: 100% — Empty States, Widget, Progress, Logo
- Iteration 21: 100% — Phase 1-4 refactor

## Remaining Backlog

### P0 — Next
- Structured notifications (documents_missing, signature_required, receipt_upload, etc.)
- Embedded SPID/CIE auth flow (modal or guided redirect)
- Communication page integration with workspace data

### P1 — Polish
- Improve chat tone further
- Enhanced agent explanations during orchestration

### P2 — Future
- Advanced analytics, multi-language, catalog expansion
