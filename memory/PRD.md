# Herion - Controlled Execution Platform (AI Practice Manager)

## Original Problem Statement
Build "Herion AI" — a digital accountant (commercialista digitale) platform. All UI in Italian, code in English.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based JWT
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Brand**: Geometric H SVG logo, teal #0ABFCF

## What's Been Implemented

### Refinement Pass (Batch 19 — 2026-04-12)
- **Guidance card redesign**: "COSA FARE" box with white background for next action, stronger "RICHIEDE LA TUA AZIONE"/"HERION STA LAVORANDO"/"IN ATTESA DALL'ENTE" labels with icons
- **Official Step "CHI AGISCE ORA"**: Large prominent amber/emerald badge with icon — user immediately knows who acts
- **Progress bar for blocked practices**: Shows green checks for completed steps + red X on blocked step (instead of all gray)
- **Timeline Italian labels**: Fixed raw codes (guard_completed → "Protezione Completato"), added missing TIMELINE_EVENTS
- **Current Agent card**: Cleaner layout with colored bot icon matching status, badge inline
- **Credentials note**: "Credenziali personali richieste (es. SPID)" — more descriptive

### Frontend Workspace Integration (Batch 18)
- PracticeDetailPage wired to workspace endpoint, Official Step card, Delegation UI, Father Review block

### Backend Workspace + Delegation (Batch 17)
- GET /workspace, POST /delegate, /revoke-delegation, /proof, /complete-official-step

### Language + Agent Behavior (Batch 16)
- Commercialista digitale positioning, Herion/Tu labels, messaging labels

### Empty States, Widget, Progress, Brand (Batch 15)
- Guided empty states, agent widget, 6-dot progress, geometric H logo

### Phase 1-4 Refactor (Batch 14)
- Understanding gate, 6-step flow, document clarity, status semantics, channel layer

### Earlier (Batches 1-13)
- Priority system, auth, catalog, governance, email, etc.

## Testing Status
- Iteration 26: 100% (12/12) — Refinement Pass
- Iteration 25: 100% (16/16) — Frontend Workspace Integration
- Iteration 24: 100% (19/19) — Backend Workspace + Delegation
- Iterations 21-23: 100%

## Remaining Backlog

### P0 — Next
- Communication page workspace integration
- Structured notifications system
- Embedded SPID/CIE auth flow

### P1 — Future
- Advanced analytics, multi-language, catalog expansion
