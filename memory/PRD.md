# TaxPilot - Assistente Fiscale Intelligente PRD

## Original Problem Statement
Build a web application called "TaxPilot" (rebranded from "AIC – Artificial Commercialista") that autonomously manages tax practices using controlled AI agents with full transparency.

## User Personas
1. **Tax Professionals**: Manage multiple client tax practices
2. **Private Individuals**: Personal tax declarations without VAT
3. **Freelancers (Libero Professionisti)**: Autonomous workers with VAT
4. **Companies (Aziende)**: Business entities with VAT

## Core Requirements
- User authentication (JWT-based)
- Tax practice management (CRUD)
- Client types: Private (no VAT), Freelancer (with VAT), Company (with VAT)
- 4 AI Agents: Analysis, Validation, Document, Communication
- Document upload and storage
- Full activity logging (transparency)
- Notifications system
- Italian UI interface

## Tech Stack
- Frontend: React + Tailwind CSS + shadcn/ui
- Backend: FastAPI
- Database: MongoDB
- AI: OpenAI GPT-5.2 via Emergent Integrations
- Storage: Emergent Object Storage
- Auth: JWT with httpOnly cookies

## What's Been Implemented

### Branding (April 7, 2026)
- Rebranded from "Artificial Commercialista" to "TaxPilot"
- New tagline: "Assistente Fiscale Intelligente"
- Modern geometric logo (deep teal #0F4C5C with emerald accent #5DD9C1)
- Updated all AI references to "TaxPilot AI" / "Agente fiscale intelligente"

### Client Types (April 7, 2026)
- Private (Privato): No VAT number required
- Freelancer (Libero Professionista): VAT number required
- Company (Azienda): VAT number required
- Dynamic VAT field visibility based on client type

### Backend
- JWT authentication (login, register, logout, me)
- Practice CRUD with client type support
- Document upload with object storage
- 4 AI Agents with GPT-5.2 integration
- Activity logging system
- Notifications system
- Dashboard stats endpoint

### Frontend
- Login/Register pages with TaxPilot branding
- Dashboard with stats cards
- Practices list with filtering
- Create practice (3-step wizard with client type selection)
- Practice detail with AI agent execution
- Agents page (shows system prompts)
- Activity log timeline

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- GET/POST/PUT/DELETE /api/practices
- POST /api/documents/upload/{practice_id}
- GET /api/documents/{document_id}
- POST /api/agents/execute
- GET /api/agents/info
- GET /api/activity-logs
- GET /api/notifications
- GET /api/dashboard/stats

## Prioritized Backlog

### P0 (Complete)
- [x] User authentication
- [x] Practice CRUD with client types
- [x] AI Agent execution
- [x] Document upload
- [x] Activity logging
- [x] TaxPilot branding

### P1 (Future)
- [ ] PDF generation for practices
- [ ] Email notifications
- [ ] Multi-language support

### P2 (Future)
- [ ] Calendar integration
- [ ] Batch document processing
- [ ] Analytics dashboard

## Next Tasks
1. Add PDF export for completed practices
2. Implement email notifications for status changes
3. Add automated AI agent workflows (chaining)
