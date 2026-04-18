# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | i18n: IT/EN (LanguageContext + translations.js)

### i18n System
- `/app/frontend/src/contexts/LanguageContext.js` — React context, localStorage persistence
- `/app/frontend/src/i18n/translations.js` — deterministic translation strings
- `/app/frontend/src/components/LanguageSwitcher.jsx` — pill toggle component
- Language switch available: user menu dropdown + profile settings + login/register pages

### Role Access
- **Creator**: Full access including Statistics, Control Room
- **Admin**: Full access EXCEPT Statistics (403 backend + frontend redirect)
- **User**: Standard access

## Key Features
- Catalog: 136 procedures, 7 categories
- Pre-Practice Intelligence: 3-phase guided flow
- Tracking: 7 identifier types, 10 states
- Consulenza Rapida: AI triage (GPT-5.2), confidence-aware UI
- Bilingual IT/EN: Sidebar, dashboard, user menu, profile, login, register, welcome, empty states
- 3-Step Registration Wizard + Trust Layer
- Practice-to-AI Bridge: Context-aware chat
- Tutela e Conformita: Rights/obligations/risks/sanctions per procedure
- Data Sovereignty: Privacy manifesto, AES-256/GDPR/UE

## Testing: Iterations 21-47 all 100%

## Execution Queue
1-10. ~~All previous items~~ DONE
11. ~~Bilingual system cleanup + Creator-only stats~~ DONE (Apr 18, 2026)
12. **NEXT**: Real SPID/CIE integration
13. Further server.py refactoring (paused)
14. Advanced analytics
15. Creator Control Room redesign (vision documented)
