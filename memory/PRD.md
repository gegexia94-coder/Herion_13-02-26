# Herion - Controlled Execution Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

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

## Testing: Iterations 21-31 all 100%

## Remaining
- P0: Scale to 120+ procedures
- P1: Real SPID/CIE integration
- P2: Advanced analytics, multi-language
