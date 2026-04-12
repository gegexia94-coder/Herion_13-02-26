# Herion - Controlled Execution Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Catalog System (Batches 22-23)

### Foundation (Backend — Batch 22)
- 5 categories: fiscale(7), previdenziale(2), societario(1), documentale(7), informativo(3)
- official_procedure vs internal_support distinction
- Enriched fields: official_action, who_acts, auth_method, proof_expected, estimated_duration, document_specs

### Browser (Frontend — Batch 23)
- Category cards with counts + "Ufficiale" badges
- Search by name/entity/action
- Filter: Tutte / Ufficiali / Interne
- Expandable cards showing: CHI FA COSA, AZIONE UFFICIALE, DOCUMENTI RICHIESTI, AUTENTICAZIONE/RICEVUTA/TEMPISTICA
- "Avvia questa procedura" CTA for official procedures
- "Catalogo" added to sidebar navigation

## Previous Batches (All 100%)
- Batch 21: Refinement 2 (notification grouping, auth flow)
- Batch 20: Communication + Notifications
- Batch 19: Refinement 1 (COSA FARE, CHI AGISCE)
- Batch 18: Frontend Workspace + Delegation
- Batch 17: Backend Workspace + Delegation
- Batches 14-16: Understanding gate, 6-step flow, language, empty states, brand
- Batches 1-13: Priority, auth, agents, email, etc.

## Testing: Iterations 21-30 all 100%

## Remaining
- P0: Catalog expansion (bulk add procedures)
- P1: Real SPID/CIE integration
- P2: Advanced analytics, multi-language
