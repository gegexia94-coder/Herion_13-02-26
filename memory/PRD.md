# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB (modularized) | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

### Backend Structure
```
/app/backend/
├── server.py              (~7380 lines — main app, routes, startup)
├── database.py, auth.py   (shared modules)
├── catalog_data.py, dependency_data.py, international_data.py (data seeds)
├── models/schemas.py      (Pydantic models incl. ConsulenzaTriageRequest)
├── routes/admin_routes.py  (admin statistics)
└── helpers/               (ready for future extractions)
```

### Frontend Language System (NEW - Apr 2026)
```
/app/frontend/src/
├── contexts/LanguageContext.js  (IT/EN context with localStorage persistence)
├── i18n/translations.js        (all bilingual strings)
├── components/LanguageSwitcher.jsx (IT/EN pill toggle)
```

## Product Vision
Herion is a digital accountant for Italian and international users. Free access, guides through 136 official procedures.

## Key Features
- **Catalog**: 136 procedures, 7 categories
- **Pre-Practice Intelligence**: 3-phase guided flow + dependency + international blocks
- **Tracking**: 7 identifier types, 10 states, workspace enrichment
- **Consulenza Rapida**: AI triage (GPT-5.2) with confidence-aware UI
- **Bilingual IT/EN**: Language switcher on Login, Register, Welcome, empty states
- **3-Step Registration Wizard**: Personal → Fiscal → Security with progress bar, tooltips, dynamic advantages
- **Trust Layer**: AES-256, GDPR, EU Data badges + social proof + human connection text

## Testing: Iterations 21-44 all 100%

## Execution Queue
1. ~~Dashboard tone refinement~~ DONE
2. ~~Dependency & risk safeguard~~ DONE
3. ~~Free access + admin stats~~ DONE
4. ~~International/EU/foreign flows~~ DONE
5. ~~server.py refactoring~~ DONE
6. ~~Document upload clarity & archive logic~~ DONE
7. ~~Consulenza rapida AI-powered triage~~ DONE
8. ~~Premium UX: 3-step wizard, bilingual IT/EN, trust badges, empty states~~ DONE (Apr 18, 2026)
9. **NEXT: Real SPID/CIE integration**
10. Further server.py refactoring (paused by user)
11. Advanced analytics
12. Multi-language support (extend beyond Login/Register/Welcome to full app)
