# Herion - Controlled Execution Platform (AI Practice Manager)

## Original Problem Statement
Build "Herion AI" — a controlled execution platform with orchestration of multiple specialized agents for fiscal and administrative practice management. All UI text in Italian. Codebase in English. Herion acts as a digital accountant: prepares practices, checks completeness, organizes documents, guides users through official channels, monitors status, and distinguishes internal actions from official external actions.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Manrope font
- **Backend**: FastAPI + MongoDB
- **Auth**: Cookie-based JWT
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (acts as "commercialista digitale")
- **Email**: Resend integration
- **Design**: Light, guided, human-first. Brand teal #0ABFCF. Geometric H SVG logo.
- **Navigation**: 7-item left sidebar
- **Core Principle**: At every step, user knows what Herion did, what Herion can do, what Herion cannot do, what user must do, where official responses arrive, and what happens next.

## Delegation Model
Herion operates under explicit delegation. It can:
- Collect and organize documents
- Validate completeness
- Prepare submission package
- Guide user to official portal
- Monitor progress
- Request missing items
- Escalate to operator if needed

Herion CANNOT:
- Sign on behalf of user
- Access government portals with user's credentials
- Submit officially without valid channel
- Claim entity acceptance without external proof

## What's Been Implemented

### Language + Agent Behavior (Batch 16 — 2026-04-11)
- **Commercialista Digitale Framing**: Welcome page headline "Il tuo commercialista digitale. Sempre al tuo fianco." Carousel explains: Prepara, Guida, Distingue, Ricorda, Non sostituisce.
- **Herion/Tu Labels**: Understanding gate clearly labels each step as "Herion" or "Tu" to distinguish responsibilities
- **Messaging Labels**: GuidanceCard shows badges: "Preparato da Herion", "Richiede la tua azione", "Passaggio ufficiale esterno", "In attesa risposta ufficiale", "Herion sta lavorando"
- **Agent Behavior**: Agent logs section renamed "Cosa ha fatto Herion" with "Preparato da Herion" badge. Each agent shows explanation of what it did.
- **Chat Prompt**: Updated to "commercialista digitale" framing with delegation awareness (what Herion did, can do, cannot do)
- **Admin Prompt**: Cleaned of markdown headers (## and **), produces plain-text structured output
- **Support FAQs**: Updated to explain delegation model ("Cosa fa Herion esattamente?", "Devo inviare io la pratica?")
- **Official Response Info**: Guidance tells user where official response will arrive (portale/PEC)

### Empty States, Agent Widget, Progress, Brand (Batch 15 — 2026-04-11)
- Guided empty states everywhere, agent activity widget, 6-dot progress, geometric H logo

### Phase 1-4 Refactor (Batch 14 — 2026-04-11)
- Understanding gate, 6-step flow, document clarity, status semantics, channel layer, new endpoints

### Earlier Batches (1-13)
- Priority system, human-first UX, agent pipeline, auth, catalog, governance, email, etc.

## Testing Status
- Iteration 23: 100% — Language + Agent Behavior
- Iteration 22: 100% — Empty States, Widget, Progress, Logo
- Iteration 21: 100% — Phase 1-4 refactor
- Iterations 16-20: 100%

## Remaining Backlog

### P0 — Next (pending checkpoint)
- Backend Agent Workspace endpoint (meaningful operational data)
- Delegation flow formalization (explicit scope selection per practice)
- Receipt/proof layer (protocol number, submission receipt, confirmation PDF)
- Structured notification system (documents missing, signature required, receipt upload required, etc.)

### P1 — Communication
- Separate official communications from Herion notifications visually
- Channel-aware notification routing

### P2 — Infrastructure
- Resend domain verification for production
- Performance optimization

### P3 — Future
- Country-specific tax rules, advanced analytics, multi-language, catalog expansion
