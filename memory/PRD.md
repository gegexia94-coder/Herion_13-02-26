# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Product Vision
Herion is a digital accountant experience that helps users manage fiscal, accounting, and administrative practices step by step. It guides users through official procedures, tracks real progress with official entities, and reduces confusion at every stage.

## Core Engine: Universal Practice Flow
Tipologia → Servizio → Herion shows Official Step + reasoning → User goes to official portal → Returns to Herion → Leaves tracking reference (DOMUS/protocollo/PEC/ricevuta) → Herion tracks, verifies, explains → Loop until completion

## Brand Positioning (Updated Apr 2026)
"Commercialista digitale" — not a gestionale, not a portale. A guided operational assistant that stays with the user from preparation to official conclusion. The welcome page communicates: who Herion is, why it matters, how it helps users become more autonomous.

## Welcome Page Structure
1. Hero — "Gestisci pratiche fiscali con piu chiarezza e meno stress"
2. Flow Steps — 4-step composition (Capisci → Prepara → Guida → Segue)
3. Why Herion — 4 benefits (Preparazione, Guida all'ente, Monitoraggio, Continuita)
4. Chi Siamo — Human, warm, with "Principio di Herion" quote
5. Orientamento / Consultation — 3 user-type cards (Libero professionista, Azienda, Privato)
6. Continuita — Prima/Durante/Dopo timeline
7. Cresci con Herion — Autonomy messaging
8. Final CTA

## Catalog System — 35 Procedures with Universal Flow Model

### Categories
| Category | Count | Official | Examples |
|----------|-------|----------|----------|
| fiscale | 14 | Yes | P.IVA, F24, Redditi PF, 730, LIPE, CU, Intrastat, e-fattura, cassetto, visura |
| previdenziale | 5 | Yes | INPS Gestione Separata, Cassetto, DURC, Artigiani, Commercianti |
| societario | 5 | Yes | Chiusura, Costituzione SRL, Variazione CCIAA, SCIA, ATECO |
| documentale | 7 | No | Richiesta docs, completezza, dossier, report, approvazione |
| informativo | 4 | No | Info fiscali, regime forfettario, follow-up, aggiornamento |

## Tracking & Status Intelligence Layer (Apr 2026)
- 7 identifier types (DOMUS, protocollo, pratica, PEC, ricevuta, invio, pagamento)
- 10 tracked states with color/category mapping
- Verification history with Herion agent checks
- Entity state tracking (received, processing, reviewing, approved, rejected)
- Next-step forecasting in plain Italian
- Mini-timeline milestones (submitted → reference → processing → completed)

## Testing: Iterations 21-33 all 100%

## Remaining
- P0: Catalog expansion to 120+ procedures
- P1: 6 operational area interfaces (Fiscal, Tax Planning, Company, Strategic, Official Procedures, Guidance)
- P2: server.py refactoring (7000+ lines → modular routes)
- P3: Real SPID/CIE integration
- P3: Advanced analytics, multi-language
