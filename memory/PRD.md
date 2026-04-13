# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | Brand: Geometric H #0ABFCF

## Product Vision
Herion is a digital accountant experience. Free access model with future monetization readiness. Guides users through official fiscal, accounting, and administrative procedures, tracks real progress, and protects from incomplete procedural logic.

## Access Model
- Current: **Free** — no payment walls, no billing UI
- Future-ready: User model has dormant `plan`, `plan_status`, `plan_features` fields
- New users default to `plan: "free"`, `plan_status: "active"`

## Admin Statistics Dashboard (/admin/stats) — NEW Apr 2026
Admin-only product intelligence with time window selector (today/7d/30d/all):
- **KPI row**: Users, Practices, Completed, Active today
- **User metrics**: registered, new (today/week/month), active (today/week/month), inactive 30d
- **User segmentation**: never_started, started_then_dropped, used_then_stopped (with progress bars)
- **Practice metrics**: total, active, completed, blocked, draft, waiting_official, completion_rate, avg_completion_days, status distribution
- **Activity trends**: daily (14-day) and weekly (8-week) bar charts
- **Operational insights**: top 10 most used procedures, most blocked procedures

## Dependency & Risk Safeguard System
16 procedures with linked_obligations, risk_if_omitted, completion_integrity
Frontend: DependencyCard in pre-practice + expandable accordion in practice detail

## Dashboard (Refined)
Welcome/orientation → Attention → Herion activity → Quick actions → Reminders → Practices → Agent activity

## Catalog: 123 procedures, 6 categories
## Pre-Practice Intelligence: 3-phase guided flow
## Tracking & Status Intelligence: 7 identifier types, 10 states
## 6 Operational Areas

## Testing: Iterations 21-39 all 100%

## Execution Queue
1. ~~Dashboard tone refinement~~ DONE
2. ~~Dependency & risk safeguard system~~ DONE
3. ~~Free access + monetization readiness + admin stats~~ DONE
4. **NEXT: International/EU/foreign flows** — extended user types, translation/legalization/apostille
5. server.py refactoring
6. Real SPID/CIE integration
