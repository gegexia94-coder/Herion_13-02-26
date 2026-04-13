# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Product Vision
Herion is a digital accountant experience. It guides users through official fiscal, accounting, and administrative procedures, tracks real progress with entities, and reduces confusion at every stage.

## Core Engine: Universal Practice Flow
Client type → Procedure selection → Pre-practice intelligence → Practice creation → Official Step → Tracking → Conclusion

## Catalog System — 123 Procedures (COMPLETE)

### Distribution by Category
| Category | Official | Internal | Total |
|----------|----------|----------|-------|
| fiscale | 30 | 0 | 30 |
| previdenziale | 17 | 0 | 17 |
| societario | 18 | 0 | 18 |
| lavoro | 15 | 0 | 15 |
| documentale | 0 | 20 | 20 |
| informativo | 0 | 23 | 23 |
| **Total** | **80** | **43** | **123** |

### Data Quality
- 0 duplicate practice_ids
- 20 procedures with url_verified=false (portals pending verification)
- All official (80) have full flow_definition, tracking_mode, proof_expected
- All entries have enriched structure: category, entity, URL, auth, proof, tracking, docs, duration

### Batch 2 Additions (+45)
- Fiscale +6: Esterometro, ISA, Bollo e-fatture, Bonus edilizi, Credito R&S, Imposta registro
- Previdenziale +5: Riscatto laurea, Ricongiunzione, Estratto conto, Bonus nido, Congedo parentale
- Societario +5: Vidimazione libri, Domiciliazione, Contratto rete, Scioglimento, Fusione
- Lavoro +10: Prospetto disabili, LUL, Welfare, CU dip, 770 sostituti, Fringe benefit, Ferie, Trasferte, Premio risultato, Cedolino co.co.co.
- Documentale +8: Conservazione, Marca temporale, Procura, Consensi, Contratto servizio, Checklist annuale, Fascicolo, Template fattura
- Informativo +11: Contributi minimi, Deduzioni, Scadenze trimestrali, Fatturazione elettronica, Impatriati, Startup, Benefit, PEC, Antiriciclaggio, Successoria, Lavoro autonomo

## Pre-Practice Intelligence Layer
3-phase guided flow: Scegli → Preparati → Conferma
Pre-start endpoint returns: orientation, entity/direction, checklist, auth, ATECO, readiness

## Tracking & Status Intelligence Layer
7 identifier types, 10 tracked states, verification history, entity tracking, workspace enrichment

## 6 Operational Areas (/services)
Fiscal, Tax Planning, Company, Strategic, Entities, Guidance

## Testing: Iterations 21-37 all 100%

## Remaining
- P1: Dashboard tone refinement (digital accountant feel)
- P2: server.py refactoring (7000+ lines → modular routes)
- P3: Real SPID/CIE integration
- P3: Advanced analytics, multi-language
