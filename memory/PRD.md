# Herion - Controlled Execution Platform (AI Practice Manager)

## Original Problem Statement
Build "Herion AI" — a controlled execution platform with orchestration of multiple specialized agents for fiscal and administrative practice management. All UI text in Italian. Codebase in English.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Manrope font
- **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based JWT
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend integration
- **Design**: Light, guided, human-first. CSS tokens (#FBFBFB, #E8F9FF, #C4D9FF, #C5BAFF), Brand teal #0ABFCF
- **Navigation**: 7-item left sidebar (Dashboard, Pratiche, Documenti, Agenti, Comunicazione, Ricerca, Supporto)

## Core Product Rule
At every moment, the user must understand:
1. What this practice is
2. What is happening now
3. What is missing
4. What the user must do next
5. What Herion will do after that
6. Whether the process is internal or official/external

## What's Been Implemented

### Phase 1-4 Refactor (Batch 14 — 2026-04-11)
- **Pre-practice Understanding Gate**: Mandatory "Prima di iniziare" screen on draft practices showing: what the practice is (from catalog), required documents, how the flow works (4 steps), destination entity, clear CTA "Inizia la pratica"
- **6-Step Practice Flow**: Comprendi → Carica → Elabora → Verifica → Firma → Completa progress bar on every practice
- **Document Clarity System**: Documents labeled as "Da caricare" (missing/required), "Ricevuto" (uploaded), "Generato da Herion" (system), "Richiede firma" (needs signature), "Firmato (p7m)" (signed). Missing docs shown with clear CTAs.
- **Expanded Status Semantics**: 16 backend statuses (draft, waiting_user_documents, documents_received, internal_processing, internal_validation_passed/failed, waiting_user_review, waiting_signature, ready_for_submission, submitted_manually/via_channel, waiting_external_response, accepted_by_entity, rejected_by_entity, completed, blocked) mapped to ~8 simple user-facing labels
- **Official Channel / Entity-Aware Layer**: Each practice shows its destination entity (e.g., "Agenzia delle Entrate"), submission method (portale ufficiale, PEC), who submits (Tu/Herion), portal URL, authentication needed. Clear distinction between internal Herion validation and official external submission.
- **New Backend Endpoints**: POST /start (draft→waiting_user_documents), POST /mark-submitted, POST /mark-completed
- **Enriched Practice API**: GET /practices/{id} now returns catalog_info, channel_info, current_step, user_status
- **Approval Flow Fixed**: No longer auto-completes. Goes draft→waiting_user_documents→internal_processing→waiting_user_review→ready_for_submission→submitted→completed with proper user gates at each step
- **Guided UX**: GuidanceCard component shows status-aware messaging at every step explaining what to do next and what Herion will do

### Human-First UX Refactor (Batch 13 — 2026-04-11)
- 7-item navigation with Documenti and Agenti
- Brand logo: geometric H
- Compact Agent Pipeline
- Human-friendly chat
- Micro-guidance on every page
- Search and Support pages
- Lighter visual style
- Dashboard greeting with contextual guidance

### Automatic Priority System (Batch 12 — 2026-04-11)
- Backend evaluate_practice_priority() with deadline, status, risk, stall rules
- Smart dashboard sections: "Urgente Ora", "In Attesa di Approvazione"
- Priority badges everywhere

### Earlier Batches (1-11)
- Agent Pipeline, Dashboard, Priority, Email, UI System, Auth, Catalog, Governance, Alerts, Vault, Follow-ups

## Testing Status
- Iteration 21: 100% — Phase 1-4 refactor (Understanding Gate, 6-Step Flow, Document Clarity, Status Semantics, Channel Layer)
- Iteration 20: 100% — Human-first UX refactor
- Iteration 19: 100% — Priority system
- Iterations 16-18: 100%

## 3rd Party Integrations
- OpenAI GPT-5.2 via Emergent LLM Key
- Resend email integration

## Remaining Backlog (Priority Order)

### P0 — Next (Phases 5-7, pending user checkpoint)
- Backend Agent Workspace Endpoint (GET /api/agents/workspace with meaningful operational data)
- Dashboard Agent Activity Widget (preview, source of truth = Agents page)
- Empty States & Guided UX enhancement (global "what happens next" at every step)

### P1 — Agent Behavior UX
- Agents explain what they are doing + current/next steps
- Human-readable statuses: "Waiting user", "Processing", "Needs approval", "Completed"

### P2 — Language & Polish
- Simplify language globally (no markdown noise in chat/system responses)
- Resend domain verification for production

### P3 — Future
- Country-specific tax rules
- Advanced analytics dashboard
- Multi-language support
- Catalog expansion to 120+ procedures
