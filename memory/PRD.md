# Herion - Controlled Execution Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Catalog Foundation (Batch 22 — 2026-04-12)

### Categories (5)
| Category | Label | Official | Count |
|----------|-------|----------|-------|
| fiscale | Fiscale | Yes | 7 |
| previdenziale | Previdenziale | Yes | 2 |
| societario | Societario | Yes | 1 |
| documentale | Documentale | No | 7 |
| informativo | Informativo | No | 3 |

### Enriched Fields (per procedure)
- `category` + `category_label` — clear grouping
- `procedure_type` — "official_procedure" vs "internal_support"
- `official_action` — {code, label, description, entity_name, form_reference}
- `who_acts` — {herion_prepares, herion_submits, user_submits, user_signs, delegation_possible, entity_response_expected}
- `auth_method` — SPID/CIE/CNS/None
- `proof_expected` — {type, timing (immediate/delayed), label, optional}
- `estimated_duration` — {label, min_days, max_days}
- `document_specs` — [{key, name, why_needed, format, mandatory}]

### Endpoints
- GET /api/catalog/categories — categories with procedure counts
- GET /api/catalog — all 20 entries
- GET /api/catalog/{id} — single entry with full enrichment

## Previous Batches (All tested 100%)
- Batch 21: Refinement pass 2 (notification grouping, context panel, auth flow)
- Batch 20: Communication + Notifications + Auth prep
- Batch 19: Refinement pass 1 (COSA FARE, CHI AGISCE, progress bar)
- Batch 18: Frontend Workspace + Delegation
- Batch 17: Backend Workspace + Delegation
- Batch 16: Language + Agent Behavior
- Batch 15: Empty States + Widget + Progress + Brand
- Batch 14: Phase 1-4 (Understanding gate, 6-step, doc clarity, statuses, channel)
- Batches 1-13: Priority, auth, catalog, governance, email, agents

## Testing: Iterations 21-29 all 100%

## Remaining
- P0: Catalog expansion (bulk add procedures), frontend catalog browser
- P1: Real SPID/CIE integration, advanced analytics
- P2: Multi-language, catalog 120+
