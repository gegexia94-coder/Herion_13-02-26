# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Product Vision
Herion is a digital accountant experience. It guides users through official fiscal, accounting, and administrative procedures, tracks real progress with entities, and reduces confusion at every stage.

## Core Engine: Universal Practice Flow
Tipologia → Servizio → Herion guides → User official step → Returns → Tracking reference → Herion monitors → Loop until conclusion

## Catalog System — 78 Procedures (Batch 1 Complete)

### Distribution by Category
| Category | Official | Internal | Total |
|----------|----------|----------|-------|
| fiscale | 24 | 0 | 24 |
| previdenziale | 12 | 0 | 12 |
| societario | 13 | 0 | 13 |
| lavoro (NEW) | 5 | 0 | 5 |
| documentale | 0 | 12 | 12 |
| informativo | 0 | 12 | 12 |
| **Total** | **54** | **24** | **78** |

### Batch 1 New Procedures Added (43 total)
**Fiscale (+10):** Mod 770, IRAP, Ravvedimento operoso, Rimborso IVA, Contratto locazione, Cedolare secca, IMU, Successione, Interpello AdE, Rateizzazione cartelle
**Previdenziale (+7):** UniEmens, F24 contributi, Maternita, NASpI, INAIL autoliquidazione, INAIL denuncia infortunio, Colf/badanti
**Societario (+8):** P.IVA societa, Deposito bilancio, Nomina amministratore, Modifica statuto, Cessione quote, PEC obbligatoria, Iscrizione REA, Trasformazione societaria
**Lavoro (+5 new category):** Assunzione, Cessazione, Trasformazione contratto, Buste paga, Conguaglio fiscale
**Documentale (+5):** Archiviazione digitale, Firma digitale, Delega cassetto, Lettera incarico, Privacy GDPR
**Informativo (+8):** Regime ordinario, Regime semplificato, Apertura attivita, Chiusura attivita, Detrazioni, Bonus fiscali, Scadenze annuali, Responsabilita fiscale

### Data Quality
- 11 procedures with `url_verified=false` (portals pending verification: SUAP, IMU, INAIL, Centro Impiego, Interpello, Rateizzazione)
- 0 duplicate practice_ids
- All official procedures have full flow_definition, tracking_mode, proof_expected, who_acts

## 6 Operational Areas (/services)
Fiscal, Tax Planning, Company, Strategic, Entities, Guidance — connected to catalog

## Tracking & Status Intelligence Layer
7 identifier types, 10 tracked states, verification history, entity tracking, workspace enrichment

## Testing: Iterations 21-35 all 100%

## Remaining
- P0: Catalog Batch 2 expansion (78 → 120+)
- P1: Dashboard tone refinement
- P2: server.py refactoring
- P3: Real SPID/CIE integration
- P3: Advanced analytics, multi-language
