# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | i18n: IT/EN

### Role Access
- **Creator**: Full access + Control Room + Father Agent + Statistics
- **Admin**: Full access EXCEPT Statistics and Control Room (403 backend + redirect)
- **User**: Standard access

## Key Features
- Catalog: 136 procedures, 7 categories
- Consulenza Rapida: AI triage (GPT-5.2)
- Bilingual IT/EN system
- 3-Step Registration Wizard + Trust Layer
- Practice-to-AI Bridge: Context-aware chat
- Tutela e Conformita: Rights/obligations/risks per procedure
- Data Sovereignty: Privacy manifesto, AES-256/GDPR/UE
- **Creator Control Room + Father Agent**: Real-time operational intelligence

## Father Agent
Reads real MongoDB data and generates prioritized insights:
- CRITICAL: blocked practices requiring intervention
- HIGH: document bottlenecks, stalled practices 7d+
- MEDIUM: abandoned drafts, inactive users
- INFO: consulenza usage, completion rates
Includes: friction points, top used procedures, stalled practice list, 7-day activity chart

## Testing: Iterations 21-48 all 100%

## Execution Queue
1-11. ~~All previous~~ DONE
12. ~~Creator Control Room + Father Agent~~ DONE (Apr 18, 2026)
13. **NEXT**: Real SPID/CIE integration
14. Further server.py refactoring (paused)
15. Advanced analytics
