# Herion - Digital Accountant Platform

## Architecture
Frontend: React + Tailwind + Shadcn | Backend: FastAPI + MongoDB | Auth: Cookie JWT | AI: GPT-5.2 via Emergent Key | i18n: IT/EN | Responsive: mobile-first, 0 overflow

## Responsive System
- `overflow-x: hidden` on body + main content wrapper
- Cards: `p-3 sm:p-4`, `overflow-hidden`, `truncate` on labels
- Grids: `grid-cols-2 sm:grid-cols-4` (quick actions), `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (metrics)
- Layout stacking: `flex-col sm:flex-row` for headers
- Tables: dual layout (hidden sm:grid desktop / sm:hidden mobile cards)
- Padding: `px-4 sm:px-5 md:px-8`
- Verified: 320px, 375px, 768px, 1920px — 0 overflow across all

## Testing: Iterations 21-50 all 100%

## Execution Queue — DONE
1-14. All features complete including responsive polish
15. **NEXT**: Real SPID/CIE integration
