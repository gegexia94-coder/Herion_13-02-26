# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Product Vision
Herion is a digital accountant experience. It guides users through official fiscal, accounting, and administrative procedures, tracks real progress with entities, reduces confusion, and protects from incomplete procedural logic.

## Core Engine: Universal Practice Flow
Client type → Procedure selection → Pre-practice intelligence (+ dependency check) → Practice creation → Official Step → Tracking → Completion integrity check

## Dependency & Risk Safeguard System (NEW Apr 2026)

### Coverage: 16 procedures with dependency maps
COMPANY_FORMATION_SRL, COMPANY_CLOSURE, SCIOGLIMENTO_SOCIETA, VAT_OPEN_PF, VAT_CLOSURE_PF, VAT_DECLARATION, INCOME_TAX_PF, MOD_770, ASSUNZIONE_DIP, CESSAZIONE_DIP, CONTRATTO_LOCAZIONE, TRASFORMAZIONE_SOCIETARIA, FUSIONE_SOCIETARIA, CESSIONE_QUOTE, INPS_GESTIONE_SEP, DICHIARAZIONE_SUCCESSIONE

### Data Model
Each mapped procedure has:
- `linked_obligations[]`: procedure_code, label, type (mandatory/recommended/conditional), why_linked, when_needed (before/during/after)
- `risk_if_omitted[]`: code, label, severity (high/medium/low), description
- `completion_integrity`: is_complete_only_if[], common_missing_steps[]

### Endpoints
- `GET /api/catalog/{id}/dependencies` — Full dependency intelligence
- Pre-start endpoint enriched with `dependencies` block

### Frontend
- **CreatePracticePage**: DependencyCard in Phase 2 (always expanded) with "Cosa non dimenticare", "Rischi da evitare", "Per completare davvero questa pratica"
- **PracticeDetailPage**: PracticeDependencyCard as expandable accordion

## Dashboard (Refined Apr 2026)
Welcome/orientation → Attention → Herion activity → Quick actions → Reminders → Practices → Agent activity

## Catalog: 123 procedures, 6 categories
## Pre-Practice Intelligence: 3-phase guided flow
## Tracking & Status Intelligence: 7 identifier types, 10 states
## 6 Operational Areas

## Testing: Iterations 21-38 all 100%

## Execution Queue
1. ~~Dashboard tone refinement~~ DONE
2. ~~Dependency & risk safeguard system~~ DONE
3. **NEXT: International/EU/foreign flows** — extended user types, translation/legalization/apostille
4. server.py refactoring
5. Real SPID/CIE integration
