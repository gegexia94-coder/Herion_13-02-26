# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Product Vision
Herion is a digital accountant experience that helps users manage fiscal, accounting, and administrative practices step by step. It guides users through official procedures, tracks real progress with official entities, and reduces confusion at every stage.

## Core Engine: Universal Practice Flow
Tipologia → Servizio → Herion shows Official Step + reasoning → User goes to official portal → Returns to Herion → Leaves tracking reference (DOMUS/protocollo/PEC/ricevuta) → Herion tracks, verifies, explains → Loop until completion

## Catalog System — 35 Procedures with Universal Flow Model

### Categories
| Category | Count | Official | Examples |
|----------|-------|----------|----------|
| fiscale | 14 | Yes | P.IVA apertura/variazione/chiusura, F24, Redditi PF, 730, LIPE, CU, Intrastat, e-fattura, cassetto, visura |
| previdenziale | 5 | Yes | INPS Gestione Separata, Cassetto, DURC, Artigiani, Commercianti |
| societario | 5 | Yes | Chiusura, Costituzione SRL, Variazione CCIAA, SCIA, ATECO |
| documentale | 7 | No | Richiesta docs, completezza, dossier, report, approvazione |
| informativo | 4 | No | Info fiscali, regime forfettario, follow-up, aggiornamento |

### Universal Flow Model (official procedures)
Each has: `flow_definition` with `official_entry_point` (real URL, auth_method, url_verified), `expected_release` (type, timing), `tracking_mode` (type, route_or_reference)

### Real Entity URLs
- Agenzia delle Entrate: telematici.agenziaentrate.gov.it
- INPS: inps.it/prestazioni-servizi, myinps2.inps.it
- Camera di Commercio: registroimprese.it, starweb.infocamere.it
- SUAP: url_verified=false (varies by municipality)

## Tracking & Status Intelligence Layer (NEW - Apr 2026)

### Tracking Data Model
Each practice has a `tracking` field:
- `identifier_type`: domus_number, protocol_number, practice_number, pec_reference, receipt_code, submission_reference, payment_reference
- `identifier_value`: The actual reference value
- `tracked_state`: not_available, pending_acquisition, acquired, verified, entity_processing, entity_reviewing, integration_requested, completed, rejected
- `entity_state`: received, processing, reviewing, waiting_integration, approved, rejected, pending_response, unknown
- `verification_history`: Array of verification events with timestamps
- `last_verified_at`: Timestamp of last Herion verification
- `next_expected_step`: Human-language forecast of next step
- `user_action_required`: Boolean

### Tracking API Endpoints
- `POST /api/practices/{id}/tracking` — Add/update tracking reference
- `GET /api/practices/{id}/tracking` — Get full tracking intelligence
- `POST /api/practices/{id}/tracking/verify` — Herion verifies tracking state

### Workspace Enrichment
The `/api/practices/{id}/workspace` endpoint now includes a full `tracking` block with:
- has_reference, identifier_type/value, tracked_state with label/color/category
- entity_name, entity_state with label
- expected_identifier from catalog, expected_timing
- verification_summary (last check, timestamp, notes)
- next_expected_step (plain Italian forecast)
- status_explanation (human language)
- mini_timeline (submitted → reference → processing → completed)
- tracking_route (link to official portal for verification)

### Frontend TrackingCard
Renders inside PracticeDetailPage with:
1. Top status block (large label + explanation)
2. Tracking reference block (type, value, copy button, status badge)
3. Herion verification block (what was checked, when, notes, count)
4. External entity state block (entity name + state)
5. Next step block ("Cosa succede adesso" + CTA if action needed)
6. Mini timeline (4 milestones with done/current/pending states)
7. Tracking route link to official portal
8. Empty/waiting states with calm messaging

### Guidance Copy
Updated to "digital accountant / Herion stays with you" tone throughout workspace guidance messages.

## Testing: Iterations 21-32 all 100%

## Remaining
- P0: Catalog expansion to 120+ procedures
- P1: Brand/Chi Siamo copy + Welcome page refresh
- P1: 6 operational area interfaces (Fiscal, Tax Planning, Company, Strategic, Official Procedures, Guidance)
- P2: server.py refactoring (7000+ lines → modular routes)
- P3: Real SPID/CIE integration
- P3: Advanced analytics, multi-language
