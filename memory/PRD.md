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
- **Navigation**: 5-item left sidebar (Dashboard, Pratiche, Comunicazione, Ricerca, Supporto)

## What's Been Implemented

### Human-First UX Refactor (Batch 13 — 2026-04-11)
- **5-item navigation**: Dashboard, Pratiche, Comunicazione, Ricerca, Supporto — always-visible labels + hint text, teal accent active state
- **Brand logo**: Uploaded circuit-board H image applied to navbar, login, welcome, register
- **Compact Agent Pipeline**: Replaced 12-block list with status message + active agent indicator + progress bar + "Attivita Agenti" button opening modal with 4 phases (Analisi, Conformita, Documenti, Esecuzione)
- **Human-friendly chat**: Backend prompt rewritten — no markdown noise, simple Italian, always ends with "Prossimo passo:" action
- **Micro-guidance**: Every page shows "what to do next" — draft ("Avvia il workflow"), waiting_approval ("Verifica e approva"), blocked ("Risolvi il problema")
- **Search page**: Full-text search across practices (client name, type, fiscal code, VAT)
- **Support page**: 5 FAQ accordions + contact email + chat guidance
- **Lighter visual style**: Reduced dark backgrounds, white surfaces, softer shadows, teal brand color
- **Dashboard greeting**: "Ciao, {name}" with contextual guidance text

### Automatic Priority System (Batch 12 — 2026-04-11)
- Backend `evaluate_practice_priority()` — deadline, status, risk, stall rules
- `refresh_all_priorities()` on startup, auto-recalc on state changes
- Smart dashboard sections: "Urgente Ora", "In Attesa di Approvazione"
- Priority badges (urgent=red, high=amber, normal=blue, low=gray) everywhere

### UI System (Batch 11 — 2026-04-11)
- Global design system, geometric logo → brand image, left sidebar, 2-column practice detail

### Agent Pipeline (Batch 10), Dashboard/Priority/Email (Batches 1-9)

## Testing Status
- Iteration 20: 100% — Human-first UX refactor (all 11 feature groups verified)
- Iteration 19: 100% — Priority system
- Iteration 18: 100% — UI refactor
- Iterations 16-17: 100%

## 3rd Party Integrations
- OpenAI GPT-5.2 via Emergent LLM Key
- Resend email integration

## Remaining Backlog
- P1: Resend domain verification for production
- P2: Country-specific tax rules
- P2: Advanced analytics dashboard
- P2: Multi-language support
- P2: Catalog expansion to 120+ procedures
