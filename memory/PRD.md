# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB (modularized) | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

### Backend Structure (Refactored Apr 2026)
```
/app/backend/
├── server.py              (~7380 lines — main app, routes, startup)
├── database.py            (13 lines — shared DB connection)
├── auth.py                (53 lines — JWT auth, password hashing, get_current_user)
├── catalog_data.py        (444 lines — 123 base catalog procedures)
├── dependency_data.py     (297 lines — 16 procedures with linked obligations/risks)
├── international_data.py  (335 lines — 13 international procedures + guidance logic)
├── models/
│   └── schemas.py         (142 lines — all Pydantic request models incl. Consulenza)
├── routes/
│   └── admin_routes.py    (163 lines — admin statistics endpoint)
└── helpers/               (ready for future extractions)
```

## Product Vision
Herion is a digital accountant for Italian and international users. Free access, guides through 136 official procedures, tracks real progress, protects from incomplete logic, supports cross-border documents.

## Catalog: 136 procedures, 7 categories
## Pre-Practice Intelligence: 3-phase guided flow + dependency + international blocks
## Tracking: 7 identifier types, 10 states, workspace enrichment
## Dependency & Risk: 16 procedures with linked obligations, risks, completion integrity
## International: 5 client types, translation/apostille/legalization guidance
## Dashboard: Warm digital accountant tone with Consulenza rapida CTA (4-column quick actions)
## Admin Stats: User/practice metrics, trends, operational insights

## Consulenza Rapida (AI-Powered Triage)
- GPT-5.2 hybrid interface: single prompt → 1-3 suggestions → optional follow-up refinement
- Confidence-aware UI: high=strong teal CTA, medium=amber "Verifica", low=dashed/muted "Esplora i requisiti"
- Vague/ambiguous queries trigger clarification mode (no suggestions until clarified)
- Weak confidence shows prominent refinement banner encouraging user to add detail
- "Avvia questa procedura" routes to pre-practice readiness flow (checklist, requirements, auth, ATECO intact)
- Disclaimers and transparency throughout. No false certainty.
- MongoDB sessions stored in `consulenza_sessions` collection

## 7 Operational Areas

## Testing: Iterations 21-43 all 100%

## Execution Queue
1. ~~Dashboard tone refinement~~ DONE
2. ~~Dependency & risk safeguard~~ DONE
3. ~~Free access + admin stats~~ DONE
4. ~~International/EU/foreign flows~~ DONE
5. ~~server.py refactoring~~ DONE (7414 → 7104 lines, modularized)
6. ~~Document upload clarity & archive logic~~ DONE
7. ~~Consulenza rapida AI-powered triage~~ DONE (Apr 13-14, 2026) — including confidence-aware UI validation
8. **NEXT: Real SPID/CIE integration**
9. Further server.py refactoring (paused by user)
10. Advanced analytics
11. Multi-language support
