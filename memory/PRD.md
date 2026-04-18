# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | i18n: IT/EN

### Backend Structure
```
/app/backend/
├── server.py (~7410 lines), database.py, auth.py
├── catalog_data.py, dependency_data.py, international_data.py
├── compliance_data.py (NEW — rights/obligations/risks per category & procedure)
├── models/schemas.py, routes/admin_routes.py, helpers/
```

## Key Features
- Catalog: 136 procedures, 7 categories
- Pre-Practice Intelligence: 3-phase guided flow + dependencies + international
- Tracking: 7 identifier types, 10 states
- Consulenza Rapida: AI triage (GPT-5.2), confidence-aware UI
- Bilingual IT/EN: Login, Register, Welcome, empty states
- 3-Step Registration Wizard + Trust Layer
- Practice-to-AI Bridge: Context-aware chat
- **Tutela e Conformita**: Rights/obligations/risks/sanctions per procedure
- **Data Sovereignty**: Privacy manifesto, doc AI badges, AES-256/GDPR/UE

## Testing: Iterations 21-46 all 100%

## Execution Queue
1-9. ~~All previous items~~ DONE
10. ~~Document Verification + Rights/Risks Guidance Layer~~ DONE (Apr 18, 2026)
11. **NEXT**: Real SPID/CIE integration
12. Further server.py refactoring (paused)
13. Advanced analytics
14. Extend bilingual to full app
