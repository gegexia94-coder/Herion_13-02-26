# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Product Vision
Herion is a digital accountant experience. It guides users through official fiscal, accounting, and administrative procedures, tracks real progress with entities, and reduces confusion at every stage.

## Core Engine: Universal Practice Flow
Client type → Procedure selection → Pre-practice intelligence (orientation, requirements, entity, auth, ATECO, readiness) → Practice creation → Official Step → Tracking → Conclusion

## Pre-Practice Intelligence Layer (NEW Apr 2026)

### 3-Phase Guided Start Flow
1. **Scegli** — Client type (Privato/Professionista/Azienda) + Procedure selection with search
2. **Preparati** — Full pre-start intelligence: orientation, entity/direction, requirements checklist, auth identification, ATECO check, who-acts summary, readiness assessment
3. **Conferma** — Client data entry + confirmation dialog → practice creation

### Pre-Start Intelligence Endpoint
`GET /api/catalog/{practice_id}/pre-start?client_type=freelancer`

Returns:
- **orientation**: practice name, description, category, is_official, risk_level, suitability
- **entity_direction**: target entity, action, portal URL, form reference, submission channel
- **checklist**: documents, identification, preconditions (each with label, why_needed, format, mandatory)
- **auth**: auth_required, method (SPID/CIE/CNS), description, when_needed
- **ateco**: relevant boolean with reason/guidance for business procedures
- **readiness**: state (ready_to_start/ready_with_warnings/likely_wrong_practice/not_ready), issues list, can_start
- **who_acts_summary**: herion_prepares, user_submits, user_signs, delegation_possible
- **timing** and **proof_expected**

### Readiness States
| State | Color | Can Start | When |
|-------|-------|-----------|------|
| ready_to_start | Green | Yes | All requirements met, client type suitable |
| ready_with_warnings | Amber | Yes | Some advisories (many docs, SPID needed, ATECO) |
| likely_wrong_practice | Amber | No | Client type not suitable for this procedure |
| not_ready | Red | No | Critical blocking conditions |

## Catalog System — 78 Procedures (Batch 1)
| Category | Official | Internal | Total |
|----------|----------|----------|-------|
| fiscale | 24 | 0 | 24 |
| previdenziale | 12 | 0 | 12 |
| societario | 13 | 0 | 13 |
| lavoro | 5 | 0 | 5 |
| documentale | 0 | 12 | 12 |
| informativo | 0 | 12 | 12 |

## Tracking & Status Intelligence Layer
7 identifier types, 10 tracked states, verification history, entity tracking, mini-timeline, workspace enrichment

## 6 Operational Areas (/services)
Fiscal, Tax Planning, Company, Strategic, Entities, Guidance — connected to catalog

## Testing: Iterations 21-36 all 100%

## Remaining
- P0: Catalog Batch 2 expansion (78 → 120+)
- P1: Dashboard tone refinement (digital accountant feel)
- P2: server.py refactoring (7000+ lines → modular routes)
- P3: Real SPID/CIE integration
- P3: Advanced analytics, multi-language
