# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF | i18n: IT/EN with LanguageContext

### Backend Structure
```
/app/backend/
├── server.py (~7380 lines), database.py, auth.py
├── catalog_data.py, dependency_data.py, international_data.py
├── models/schemas.py, routes/admin_routes.py, helpers/
```

## Product Vision
Digital accountant for IT/international users. 136 procedures, free access, guided flows.

## Key Features
- Catalog: 136 procedures, 7 categories
- Pre-Practice Intelligence: 3-phase guided flow
- Tracking: 7 identifier types, 10 states
- Consulenza Rapida: AI triage (GPT-5.2), confidence-aware UI
- Bilingual IT/EN: Language switcher on Login, Register, Welcome, empty states
- 3-Step Registration Wizard: Personal → Fiscal → Security
- Trust Layer: AES-256, GDPR, EU Data badges
- Practice-to-AI Bridge: Context-aware chat within practice detail

## Testing: Iterations 21-45 all 100%

## Execution Queue
1-8. ~~All previous items~~ DONE
9. ~~Practice-to-AI bridge fix + UX tightening~~ DONE (Apr 18, 2026)
   - Fixed context-aware practice chat with 'Contesto attivo' badge
   - Added Consulenza loading reassurance
   - Unified navigation labels (sidebar ↔ dashboard)
   - Enhanced practice continuity with missing-docs hints
10. **NEXT: Document Verification + Rights/Risks Guidance Layer**
11. Real SPID/CIE integration
12. Further server.py refactoring (paused)
13. Advanced analytics
14. Extend bilingual to full app
