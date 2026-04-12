# Herion - Controlled Execution Platform

## Architecture
- Frontend: React + Tailwind CSS + Shadcn UI | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Implemented (All tested 100%)

### Communication + Notifications + Auth Prep (Batch 20 — 2026-04-12)
- **Communication Page**: Workspace-driven context panel. Click email → right panel shows linked practice state, current agent, guidance, official action, who acts now. Practice links on every email. Stats: "Richiedono azione", "Inviate", "Bloccate". Create form with practice selector.
- **Notification System**: Bell icon in sidebar with unread badge (polls every 30s). Panel overlay with type-based colors: amber=action, red=urgent, blue=Herion, green=success, purple=entity. Source labels (Herion/Sistema/Ente). Mark all read. Non-intrusive.
- **Auth Flow Preparation**: New statuses: awaiting_authentication, submission_in_progress. "Accedi e continua" CTA on Official Step card when credentials required. Backend + frontend ready for future SPID/CIE integration.

### Refinement Pass (Batch 19)
- COSA FARE box, CHI AGISCE ORA badge, blocked progress bar, Italian timeline labels

### Frontend Workspace Integration (Batch 18)
- PracticeDetailPage wired to workspace, Official Step card, Delegation UI, Father Review

### Backend Workspace + Delegation (Batch 17)
- GET /workspace, POST /delegate, /revoke-delegation, /proof, /complete-official-step

### Earlier (Batches 14-16): Understanding gate, 6-step flow, doc clarity, statuses, language, empty states, agent widget, progress, brand
### Earlier (Batches 1-13): Priority, auth, catalog, governance, email, agents

## Testing: Iterations 21-27 all 100%

## Remaining Backlog
- P0: Real SPID/CIE embedded auth integration (UI ready, needs provider)
- P1: Advanced analytics, multi-language, catalog expansion
